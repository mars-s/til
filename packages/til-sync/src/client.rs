use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use reqwest::{Client, StatusCode, header::{HeaderMap, HeaderName, HeaderValue}};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A scheduled time slot (used when committing a smart scheduler suggestion).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TimeSlot {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
}

/// A task as returned by the Supabase REST API.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub priority: String,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub deadline_at: Option<DateTime<Utc>>,
    pub duration_minutes: Option<u32>,
    pub tags: Vec<String>,
    pub calendar_event_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Fields for creating a new task.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewTask {
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scheduled_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deadline_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_minutes: Option<u32>,
    #[serde(default)]
    pub tags: Vec<String>,
}

/// Partial update for a task (all fields optional).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TaskPatch {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub title: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub priority: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scheduled_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub deadline_at: Option<DateTime<Utc>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_minutes: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub calendar_event_id: Option<String>,
}

/// A calendar event as returned by the REST API.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalendarEvent {
    pub id: Uuid,
    pub calendar_id: Uuid,
    pub google_event_id: Option<String>,
    pub title: String,
    pub start_at: DateTime<Utc>,
    pub end_at: Option<DateTime<Utc>>,
    pub is_task_block: bool,
    pub is_suggestion: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Result from the create-calendar-event edge function.
#[derive(Debug, Clone, Deserialize)]
pub struct ScheduleTaskResult {
    pub ok: bool,
    pub google_event_id: String,
    pub calendar_event_id: String,
}

/// Supabase sync client — wraps REST API calls.
/// Realtime subscriptions are handled separately in `realtime.rs`.
pub struct SyncClient {
    supabase_url: String,
    anon_key: String,
    access_token: String,          // Supabase JWT from signed-in session
    http: Client,
}

impl SyncClient {
    pub fn new(
        supabase_url: impl Into<String>,
        anon_key: impl Into<String>,
        access_token: impl Into<String>,
    ) -> Self {
        Self {
            supabase_url: supabase_url.into(),
            anon_key: anon_key.into(),
            access_token: access_token.into(),
            http: Client::new(),
        }
    }

    fn rest_url(&self, path: &str) -> String {
        format!("{}/rest/v1/{}", self.supabase_url, path)
    }

    fn fn_url(&self, name: &str) -> String {
        format!("{}/functions/v1/{}", self.supabase_url, name)
    }

    fn auth_headers(&self) -> HeaderMap {
        let mut map = HeaderMap::new();
        map.insert(
            HeaderName::from_static("apikey"),
            HeaderValue::from_str(&self.anon_key).unwrap(),
        );
        map.insert(
            HeaderName::from_static("authorization"),
            HeaderValue::from_str(&format!("Bearer {}", self.access_token)).unwrap(),
        );
        map
    }

    // ── Tasks ─────────────────────────────────────────────────────────────────

    pub async fn list_tasks(&self) -> Result<Vec<Task>> {
        let resp = self.http
            .get(self.rest_url("tasks"))
            .query(&[("order", "created_at.desc")])
            .headers(self.auth_headers())
            .header("Content-Type", "application/json")
            .send()
            .await
            .context("GET /tasks")?;

        resp.json::<Vec<Task>>().await.context("parse tasks")
    }

    pub async fn create_task(&self, task: &NewTask) -> Result<Task> {
        let resp = self.http
            .post(self.rest_url("tasks"))
            .headers(self.auth_headers())
            .header("Content-Type", "application/json")
            .header("Prefer", "return=representation")
            .json(task)
            .send()
            .await
            .context("POST /tasks")?;

        let mut tasks: Vec<Task> = resp.json().await.context("parse created task")?;
        tasks.pop().context("no task returned")
    }

    pub async fn update_task(&self, id: Uuid, patch: &TaskPatch) -> Result<Task> {
        let resp = self.http
            .patch(self.rest_url(&format!("tasks?id=eq.{id}")))
            .headers(self.auth_headers())
            .header("Content-Type", "application/json")
            .header("Prefer", "return=representation")
            .json(patch)
            .send()
            .await
            .context("PATCH /tasks")?;

        let mut tasks: Vec<Task> = resp.json().await.context("parse updated task")?;
        tasks.pop().context("no task returned")
    }

    pub async fn delete_task(&self, id: Uuid) -> Result<()> {
        let resp = self.http
            .delete(self.rest_url(&format!("tasks?id=eq.{id}")))
            .headers(self.auth_headers())
            .send()
            .await
            .context("DELETE /tasks")?;

        if resp.status() == StatusCode::NO_CONTENT || resp.status().is_success() {
            Ok(())
        } else {
            anyhow::bail!("delete task failed: {}", resp.status())
        }
    }

    // ── Calendar Events ────────────────────────────────────────────────────────

    pub async fn list_calendar_events(
        &self,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
    ) -> Result<Vec<CalendarEvent>> {
        let resp = self.http
            .get(self.rest_url("calendar_events"))
            .query(&[
                ("start_at", &format!("gte.{}", from.to_rfc3339())),
                ("end_at", &format!("lte.{}", to.to_rfc3339())),
                ("order", &"start_at.asc".to_string()),
            ])
            .headers(self.auth_headers())
            .send()
            .await
            .context("GET /calendar_events")?;

        resp.json::<Vec<CalendarEvent>>().await.context("parse events")
    }

    // ── Scheduling ─────────────────────────────────────────────────────────────

    /// Commit a suggestion: creates a Google Calendar event and links it to the task.
    pub async fn schedule_task(&self, task_id: Uuid, slot: &TimeSlot) -> Result<ScheduleTaskResult> {
        let task = self.update_task(task_id, &TaskPatch {
            scheduled_at: Some(slot.start),
            ..Default::default()
        }).await?;

        let body = serde_json::json!({
            "task_id": task_id.to_string(),
            "title": task.title,
            "start_at": slot.start.to_rfc3339(),
            "end_at": slot.end.to_rfc3339(),
        });

        let resp = self.http
            .post(self.fn_url("create-calendar-event"))
            .headers(self.auth_headers())
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .context("POST /functions/create-calendar-event")?;

        resp.json::<ScheduleTaskResult>().await.context("parse schedule result")
    }
}
