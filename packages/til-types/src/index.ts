// Generated types will be added by: supabase gen types typescript --linked > src/database.ts
// Hand-written mirror types for Rust structs follow

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  scheduled_at?: string;   // ISO8601
  deadline_at?: string;
  duration_minutes?: number;
  tags: string[];
  calendar_event_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Calendar {
  id: string;
  user_id: string;
  name: string;
  google_calendar_id?: string;
  color: string;
  is_primary: boolean;
  sync_token?: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  calendar_id: string;
  google_event_id?: string;
  title: string;
  start_at: string;
  end_at?: string;
  is_task_block: boolean;
  is_suggestion: boolean;
  raw_json?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// NLP types mirroring Rust til-core

export type SpanKind = 'Time' | 'Date' | 'Duration' | 'Priority' | 'Tag' | 'Recurrence';

export interface Span {
  start: number;
  end: number;
  kind: SpanKind;
}

export interface ParsedTask {
  title: string;
  scheduled_at?: string;
  deadline_at?: string;
  duration_minutes?: number;
  priority: TaskPriority;
  tags: string[];
  spans: Span[];
}

export interface ParsedEvent {
  title: string;
  start_at?: string;
  end_at?: string;
  duration_minutes?: number;
  rrule?: string;
  spans: Span[];
}

// Scheduler types

export interface Suggestion {
  start: string;
  end: string;
  confidence: number;
  reason: string;
}
