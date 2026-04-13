/// Supabase Realtime subscription stub.
/// Full WebSocket implementation wired in Phase 7 once the DB is up.
/// The desktop app uses tokio channels to receive change events.

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ChangeEvent {
    Insert { record: serde_json::Value },
    Update { record: serde_json::Value, old_record: serde_json::Value },
    Delete { old_record: serde_json::Value },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskChange {
    pub table: String,
    pub change: ChangeEvent,
}

/// Placeholder — will connect via WebSocket to:
/// wss://<project>.supabase.co/realtime/v1/websocket?apikey=<anon>
/// and subscribe to: postgres_changes on tasks + calendar_events filtered by user_id
pub struct RealtimeClient {
    pub supabase_url: String,
    pub anon_key: String,
    pub user_id: Uuid,
}

impl RealtimeClient {
    pub fn new(
        supabase_url: impl Into<String>,
        anon_key: impl Into<String>,
        user_id: Uuid,
    ) -> Self {
        Self {
            supabase_url: supabase_url.into(),
            anon_key: anon_key.into(),
            user_id,
        }
    }
    // TODO Phase 7: async fn subscribe(&self, tx: Sender<TaskChange>) -> Result<()>
}
