# Phase 3 — Supabase Schema

## Goal
Migrations, RLS policies, and TypeScript type generation. Everything the backend needs before auth and sync.

## Prerequisites
- Supabase project created (user provides keys)
- Supabase CLI linked to project

## Migration files

### `001_initial_schema.sql`
```sql
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

-- user_tokens (server-side only, never exposed to anon key)
create table user_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_access_token text,
  google_refresh_token text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
```

### `002_rls_policies.sql`
```sql
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

-- user_tokens: service role only — no anon/user access
create policy "service_role_only_tokens" on user_tokens
  for all using (false);   -- blocked for all roles except service_role bypassing RLS
```

### `003_realtime.sql`
```sql
-- Enable realtime for live sync
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table calendar_events;
```

### `004_updated_at_trigger.sql`
```sql
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
```

## Type generation
```bash
supabase gen types typescript --linked > packages/til-types/src/database.ts
```
Run after every migration.

## Supabase CLI commands
```bash
supabase db push          # apply migrations to remote
supabase db reset         # reset local dev DB
supabase start            # start local Supabase stack
```

## Env file template (`.env.example`)
```
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_PASSWORD=
```
