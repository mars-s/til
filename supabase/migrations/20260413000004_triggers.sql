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
