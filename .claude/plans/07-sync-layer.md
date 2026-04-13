# Phase 7 — Sync Layer

## Goal
Bidirectional sync between Supabase and Google Calendar. Real-time updates pushed to desktop and mobile via Supabase Realtime.

## Edge Function: `supabase/functions/google-calendar-webhook/index.ts`
Receives push notifications from Google:
```typescript
// Google POSTs here when any event changes
POST /functions/google-calendar-webhook
Headers: X-Goog-Channel-Id, X-Goog-Resource-State

→ Identify calendar from channel ID
→ Fetch changed events (incremental sync using syncToken)
→ Upsert into calendar_events table
→ Supabase Realtime automatically broadcasts to subscribers
```

## Rust sync client (`packages/til-sync/src/`)
```rust
pub struct SyncClient {
    supabase_url: String,
    anon_key: String,
    session: Session,
}

impl SyncClient {
    // Subscribe to realtime changes
    pub async fn subscribe_tasks(&self, tx: Sender<Vec<Task>>) -> Result<()>
    pub async fn subscribe_events(&self, tx: Sender<Vec<CalendarEvent>>) -> Result<()>

    // CRUD operations
    pub async fn create_task(&self, task: &NewTask) -> Result<Task>
    pub async fn update_task(&self, id: Uuid, patch: &TaskPatch) -> Result<Task>
    pub async fn delete_task(&self, id: Uuid) -> Result<()>
    pub async fn list_tasks(&self) -> Result<Vec<Task>>

    // Task → Calendar event
    pub async fn schedule_task(&self, task_id: Uuid, slot: &TimeSlot) -> Result<CalendarEvent>
}
```

## Task → Google Calendar flow
```
User creates task with scheduled_at
→ Desktop calls SyncClient::create_task()
→ Edge fn trigger (or client calls schedule_task)
→ Creates Google Cal event in "Til" calendar
→ Stores google_event_id back on task row
→ Realtime broadcast → both clients update
```

## Edge Function: `supabase/functions/create-calendar-event/index.ts`
```typescript
// Called when a task gets a scheduled_at
// Creates Google Calendar event, returns event ID
```

## Supabase Realtime in Desktop (`src/sync/supabase.rs`)
```rust
// WebSocket subscription to postgres_changes
// On change: dispatch action to update AppModel
supabase_realtime
  .channel("tasks")
  .on_postgres_changes(filter: user_tasks, callback: handle_task_change)
  .subscribe();
```

## Conflict resolution
- Last-write-wins on `updated_at`
- Offline: queue mutations locally, flush on reconnect (in `til-sync`)

## Milestone
Create a task on desktop → appears in Google Calendar. Change event in Google Cal → updates appear on desktop within 5 seconds via webhook + Realtime.
