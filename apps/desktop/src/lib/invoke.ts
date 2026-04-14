import { invoke as tauriInvoke } from "@tauri-apps/api/core";

// ── Shared types ────────────────────────────────────────────────────────────

export type TaskStatus = "Todo" | "InProgress" | "Done";
export type Priority = "Low" | "Medium" | "High" | "Urgent";

export interface Subtask {
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  status: "Todo" | "InProgress" | "Done";
  priority: "Urgent" | "High" | "Medium" | "Low";
  scheduled_at: string | null;
  deadline_at: string | null;
  created_at: string;
  duration_minutes: number | null;
  tags: string[];
  description: string | null;
  subtasks: Subtask[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  is_suggestion: boolean;
  color: string | null;
  calendar_name: string | null;
}

export type SpanKind = "Time" | "Date" | "Duration" | "Priority" | "Tag" | "Recurrence";

export interface Span {
  start: number;
  end: number;
  kind: SpanKind;
}

export interface ParsedTask {
  title: string;
  scheduled_at: string | null;
  deadline_at: string | null;
  duration_minutes: number | null;
  priority: Priority;
  tags: string[];
  spans: Span[];
}

export interface ParsedEvent {
  title: string;
  start_at: string | null;
  end_at: string | null;
  duration_minutes: number | null;
  rrule: string | null;
  spans: Span[];
}

// ── Task commands ───────────────────────────────────────────────────────────

export function getTasks(): Promise<Task[]> {
  return tauriInvoke<Task[]>("get_tasks");
}

export interface CreateTaskArgs {
  title: string;
  scheduledAt?: string | null;
  deadlineAt?: string | null;
  durationMinutes?: number | null;
  priority?: Priority | null;
  tags?: string[] | null;
}

export function createTask(args: CreateTaskArgs): Promise<Task> {
  return tauriInvoke<Task>("create_task", {
    title: args.title,
    scheduled_at: args.scheduledAt ?? null,
    deadline_at: args.deadlineAt ?? null,
    duration_minutes: args.durationMinutes ?? null,
    priority: args.priority ?? null,
    tags: args.tags ?? null,
  });
}

export function toggleTask(id: string): Promise<Task | null> {
  return tauriInvoke<Task | null>("toggle_task", { id });
}

export function deleteTask(id: string): Promise<boolean> {
  return tauriInvoke<boolean>("delete_task", { id });
}

// ── NLP commands ────────────────────────────────────────────────────────────

export function parseTask(input: string): Promise<ParsedTask> {
  return tauriInvoke<ParsedTask>("parse_task", { input });
}

export function parseCalendar(input: string): Promise<ParsedEvent> {
  return tauriInvoke<ParsedEvent>("parse_calendar", { input });
}

// ── Event commands ──────────────────────────────────────────────────────────

export function getEvents(): Promise<CalendarEvent[]> {
  return tauriInvoke<CalendarEvent[]>("get_events");
}

export interface CreateEventArgs {
  title: string;
  startAt: string;
  endAt: string;
  isSuggestion?: boolean;
  color?: string | null;
}

export function createEvent(args: CreateEventArgs): Promise<CalendarEvent> {
  return tauriInvoke<CalendarEvent>("create_event", {
    title: args.title,
    startAt: args.startAt,
    endAt: args.endAt,
    isSuggestion: args.isSuggestion ?? false,
    color: args.color ?? null,
  });
}
