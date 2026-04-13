import { getSupabase } from './supabase';
import type { Task, CalendarEvent } from './invoke';

export async function fetchTasks(): Promise<Task[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    status:
      row.status === 'todo'
        ? 'Todo'
        : row.status === 'in_progress'
          ? 'InProgress'
          : ('Done' as Task['status']),
    priority: (row.priority.charAt(0).toUpperCase() +
      row.priority.slice(1)) as Task['priority'],
    scheduled_at: row.scheduled_at ?? null,
    deadline_at: row.deadline_at ?? null,
    duration_minutes: row.duration_minutes ?? null,
    tags: row.tags ?? [],
  }));
}

export async function insertTask(task: Omit<Task, 'id'>): Promise<Task> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: task.title,
      status:
        task.status === 'Todo'
          ? 'todo'
          : task.status === 'InProgress'
            ? 'in_progress'
            : 'done',
      priority: task.priority.toLowerCase(),
      scheduled_at: task.scheduled_at,
      deadline_at: task.deadline_at,
      duration_minutes: task.duration_minutes,
      tags: task.tags,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...task, id: data.id };
}

export async function updateTaskStatus(
  id: string,
  status: 'todo' | 'in_progress' | 'done',
): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function removeTask(id: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*, calendars(name, color)')
    .order('start_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    start_at: row.start_at,
    end_at: row.end_at ?? row.start_at,
    is_suggestion: row.is_suggestion,
    color: row.calendars?.color ?? null,
  }));
}
