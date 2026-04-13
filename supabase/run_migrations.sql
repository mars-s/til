-- ============================================================
-- Til — Run this in the Supabase SQL editor
-- Project: hufgihpjtigiylwkimfw
-- Generated: 2026-04-13
-- ============================================================

-- Enable pgcrypto for UUID generation
create extension if not exists "pgcrypto";

-- Enums
create type task_status as enum ('todo', 'in_progress', 'done');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');

-- tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  scheduled_at timestamptz,
  deadline_at timestamptz,
  duration_minutes int,
  tags text[] default '{}',
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- calendars
create table calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  google_calendar_id text,
  color text default '#4285F4',
  is_primary bool not null default false,
  sync_token text,
  webhook_resource_id text,
  webhook_expiration timestamptz,
  created_at timestamptz not null default now()
);

-- calendar_events
create table calendar_events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid references calendars(id) on delete cascade not null,
  google_event_id text,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  is_task_block bool not null default false,
  is_suggestion bool not null default false,
  raw_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- user_tokens — server-side only, never exposed via anon key
create table user_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_access_token text,
  google_refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
-- Enable RLS on all tables
alter table tasks enable row level security;
alter table calendars enable row level security;
alter table calendar_events enable row level security;
alter table user_tokens enable row level security;

-- tasks: users own their rows
create policy "users_own_tasks" on tasks
  for all using (auth.uid() = user_id);

-- calendars: users own their rows
create policy "users_own_calendars" on calendars
  for all using (auth.uid() = user_id);

-- calendar_events: accessible via calendar ownership
create policy "users_own_calendar_events" on calendar_events
  for all using (
    exists (
      select 1 from calendars
      where calendars.id = calendar_events.calendar_id
        and calendars.user_id = auth.uid()
    )
  );

-- user_tokens: blocked for all non-service-role access
-- (service_role bypasses RLS automatically)
create policy "no_user_access_to_tokens" on user_tokens
  for all using (false);
-- Enable Supabase Realtime for live sync across desktop and mobile
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table calendar_events;
-- Auto-update updated_at on row modifications
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

create trigger calendar_events_updated_at
  before update on calendar_events
  for each row execute function update_updated_at();

create trigger user_tokens_updated_at
  before update on user_tokens
  for each row execute function update_updated_at();

-- Migration 005: unique constraint for Google event upserts
alter table calendar_events
  add constraint calendar_events_calendar_id_google_event_id_key
  unique (calendar_id, google_event_id);
