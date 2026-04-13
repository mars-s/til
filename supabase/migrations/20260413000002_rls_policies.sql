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
