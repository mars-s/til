-- Required for upsert conflict resolution in the google-calendar-setup function.
-- A calendar should never have two rows for the same Google event ID.
alter table calendar_events
  add constraint calendar_events_calendar_id_google_event_id_key
  unique (calendar_id, google_event_id);
