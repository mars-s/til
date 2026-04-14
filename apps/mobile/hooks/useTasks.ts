import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  fetchTasks,
  insertTask,
  updateTaskStatus,
  removeTask,
  updateTaskDate,
} from '../lib/db';
import type { Task } from '../components/TaskRow';
import type { ParsedTask } from '../lib/nlp';

function isToday(isoStr: string | null): boolean {
  if (!isoStr) return false;
  const d = new Date(isoStr);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

function isFuture(isoStr: string | null): boolean {
  if (!isoStr) return false;
  const d = new Date(isoStr);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return d > end;
}

export function useTasks() {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchTasks()
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('tasks_mobile')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setTasks((prev) => [payload.new as Task, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTasks((prev) =>
              prev.map((t) => (t.id === (payload.new as Task).id ? (payload.new as Task) : t)),
            );
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev) => prev.filter((t) => t.id !== (payload.old as Task).id));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const addTask = useCallback(async (parsed: ParsedTask) => {
    const raw: Omit<Task, 'id'> = {
      title:            parsed.title,
      status:           'Todo',
      priority:         parsed.priority,
      scheduled_at:     parsed.scheduled_at ?? null,
      deadline_at:      parsed.deadline_at  ?? null,
      duration_minutes: parsed.duration_minutes ?? null,
      tags:             parsed.tags,
      description:      null,
      subtasks:         [],
      created_at:       new Date().toISOString(),
    };
    const task = await insertTask(raw);
    setTasks((prev) => [task, ...prev]);
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const next: Task['status'] = task.status === 'Done' ? 'Todo' : 'Done';
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: next } : t)));
    await updateTaskStatus(id, next);
  }, [tasks]);

  const deleteTask = useCallback(async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await removeTask(id);
  }, []);

  const setDate = useCallback(async (id: string, date: string | null) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, scheduled_at: date } : t)));
    await updateTaskDate(id, date);
  }, []);

  // ── Bucket helpers ─────────────────────────────────────────────────────────
  const todayTasks     = tasks.filter((t) => t.status !== 'Done' && isToday(t.scheduled_at));
  const scheduledTasks = tasks.filter((t) => t.status !== 'Done' && !isToday(t.scheduled_at) && isFuture(t.scheduled_at));
  const somedayTasks   = tasks.filter((t) => t.status !== 'Done' && !t.scheduled_at);
  const doneTasks      = tasks.filter((t) => t.status === 'Done');

  return {
    tasks,
    loading,
    error,
    addTask,
    toggleTask,
    deleteTask,
    setDate,
    todayTasks,
    scheduledTasks,
    somedayTasks,
    doneTasks,
  };
}
