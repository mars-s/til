-- Enable Supabase Realtime for live sync across desktop and mobile
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table calendar_events;
