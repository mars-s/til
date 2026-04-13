use crate::types::{CalendarEvent, ParsedTask};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Suggestion {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub confidence: f32,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreferences {
    /// Working hours as (start_hour, end_hour) in 24h, e.g. (9, 18)
    pub work_hours: (u8, u8),
    /// Deep focus window, e.g. (9, 12)
    pub focus_time: (u8, u8),
    /// IANA timezone string
    pub timezone: String,
}

impl Default for UserPreferences {
    fn default() -> Self {
        Self {
            work_hours: (9, 18),
            focus_time: (9, 12),
            timezone: "UTC".to_string(),
        }
    }
}

/// Find the top 3 suggested time slots for a task given existing calendar events.
/// TODO: full implementation in Phase 10 (scheduler-agent)
pub fn find_suggestions(
    _task: &ParsedTask,
    _events: &[CalendarEvent],
    _preferences: &UserPreferences,
) -> Vec<Suggestion> {
    Vec::new()
}
