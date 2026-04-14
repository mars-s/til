import { getSupabase } from './supabase';
import type { Task, Subtask, CalendarEvent } from './invoke';

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
    created_at: row.created_at,
    tags: row.tags ?? [],
    description: row.description ?? null,
    subtasks: row.subtasks ?? [],
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
      description: task.description,
      subtasks: task.subtasks,
    })
    .select()
    .single();
  if (error) throw error;
  return { ...task, id: data.id, created_at: data.created_at };
}

export async function updateTaskStatus(
  id: string,
  status: 'todo' | 'in_progress' | 'done',
): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('tasks').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function updateTaskTitle(id: string, title: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('tasks').update({ title }).eq('id', id);
  if (error) throw error;
}

export async function updateTaskDescription(id: string, description: string | null): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('tasks').update({ description }).eq('id', id);
  if (error) throw error;
}

export async function updateTaskSubtasks(id: string, subtasks: Subtask[]): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('tasks').update({ subtasks }).eq('id', id);
  if (error) throw error;
}

export async function updateTaskDate(id: string, scheduled_at: string | null): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('tasks').update({ scheduled_at }).eq('id', id);
  if (error) throw error;
}

export async function updateTaskTags(id: string, tags: string[]): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('tasks').update({ tags }).eq('id', id);
  if (error) throw error;
}

export async function fetchTags(): Promise<string[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('user_tags')
    .select('name')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((r) => r.name);
}

export async function ensureTag(name: string): Promise<void> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('user_tags')
    .upsert({ user_id: user.id, name }, { onConflict: 'user_id,name' })
    .throwOnError();
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
