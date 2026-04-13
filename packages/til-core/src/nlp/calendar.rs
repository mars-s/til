use crate::types::ParsedEvent;

const _CALENDAR_RULES_TOML: &str = include_str!("../../rules/calendar.toml");

/// Parse a natural language event description into a ParsedEvent.
/// Mirrors task::parse but uses calendar-specific rules.
pub fn parse(input: &str) -> ParsedEvent {
    // TODO: full implementation in Phase 2 (nlp-agent)
    // Stub returns a minimal struct so the crate compiles.
    ParsedEvent {
        title: input.to_string(),
        start_at: None,
        end_at: None,
        duration_minutes: None,
        rrule: None,
        spans: Vec::new(),
    }
}
