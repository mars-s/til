import { supabase } from './supabase';
import type { Task } from '../components/TaskRow';

// ── Fetch ─────────────────────────────────────────────────────────────────
export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

// ── Insert ────────────────────────────────────────────────────────────────
export async function insertTask(task: Omit<Task, 'id'>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, status: 'Todo' })
    .select()
    .single();

  if (error) throw error;
  return mapRow(data);
}

// ── Update status ─────────────────────────────────────────────────────────
export async function updateTaskStatus(id: string, status: Task['status']) {
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
  if (error) throw error;
}

// ── Delete ────────────────────────────────────────────────────────────────
export async function removeTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

// ── Update date ───────────────────────────────────────────────────────────
export async function updateTaskDate(id: string, scheduled_at: string | null) {
  const { error } = await supabase.from('tasks').update({ scheduled_at }).eq('id', id);
  if (error) throw error;
}

// ── Row mapper ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(row: any): Task {
  return {
    id:               row.id,
    title:            row.title,
    status:           row.status   ?? 'Todo',
    priority:         row.priority ?? 'Medium',
    scheduled_at:     row.scheduled_at   ?? null,
    deadline_at:      row.deadline_at    ?? null,
    duration_minutes: row.duration_minutes ?? null,
    tags:             row.tags    ?? [],
    description:      row.description ?? null,
    subtasks:         row.subtasks   ?? [],
    created_at:       row.created_at,
  };
}
