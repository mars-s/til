use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Priority {
    Low,
    Medium,
    High,
    Urgent,
}

impl Default for Priority {
    fn default() -> Self {
        Priority::Medium
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum TaskStatus {
    Todo,
    InProgress,
    Done,
}

impl Default for TaskStatus {
    fn default() -> Self {
        TaskStatus::Todo
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SpanKind {
    Time,
    Date,
    Duration,
    Priority,
    Tag,
    Recurrence,
}

/// A matched region in the raw input string, used for inline highlighting.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Span {
    pub start: usize,
    pub end: usize,
    pub kind: SpanKind,
}

/// Result of parsing a natural-language task string.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ParsedTask {
    pub title: String,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub deadline_at: Option<DateTime<Utc>>,
    pub duration_minutes: Option<u32>,
    pub priority: Priority,
    pub tags: Vec<String>,
    /// Matched spans for real-time UI highlighting.
    pub spans: Vec<Span>,
}

/// Result of parsing a natural-language calendar event string.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedEvent {
    pub title: String,
    pub start_at: Option<DateTime<Utc>>,
    pub end_at: Option<DateTime<Utc>>,
    pub duration_minutes: Option<u32>,
    /// RFC 5545 recurrence rule, e.g. "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR"
    pub rrule: Option<String>,
    pub spans: Vec<Span>,
}

/// A calendar event from the database (used by the scheduler).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub start_at: DateTime<Utc>,
    pub end_at: Option<DateTime<Utc>>,
    pub is_task_block: bool,
    pub is_suggestion: bool,
}
