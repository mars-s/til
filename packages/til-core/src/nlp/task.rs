use crate::types::{ParsedTask, Priority, Span};
use crate::nlp::engine::{CompiledRule, RuleSet};
use anyhow::Result;
use chrono::{DateTime, Datelike, Local, NaiveDate, NaiveTime, TimeZone, Utc, Weekday};

const TASK_RULES_TOML: &str = include_str!("../../rules/tasks.toml");

pub fn parse(input: &str) -> ParsedTask {
    let rules = load_rules().unwrap_or_default();
    let mut task = ParsedTask {
        title: input.to_string(),
        ..Default::default()
    };
    let mut spans: Vec<Span> = Vec::new();
    let mut title_mask = vec![true; input.len()]; // chars to keep in title

    let now = Local::now();

    for rule in &rules {
        let Some(span) = rule.find_span(input) else { continue };

        match rule.rule.sets.as_str() {
            "scheduled_at" => {
                if let Some(caps) = rule.captures(input) {
                    let time_str = caps.get(1).map(|m| m.as_str()).unwrap_or("");
                    if let Some(dt) = parse_time_str(time_str, now.date_naive()) {
                        task.scheduled_at = Some(dt);
                        mask_range(&mut title_mask, span.start, span.end);
                    }
                }
            }
            "scheduled_at_date" => {
                let matched = &input[span.start..span.end];
                if let Some(date) = parse_date_str(matched.trim(), now.date_naive()) {
                    // merge with existing time if any
                    let time = task.scheduled_at
                        .and_then(|dt| Some(dt.with_timezone(&Local).time()))
                        .unwrap_or_else(|| NaiveTime::from_hms_opt(9, 0, 0).unwrap());
                    task.scheduled_at = date_time_to_utc(date, time);
                    mask_range(&mut title_mask, span.start, span.end);
                }
            }
            "deadline_at" => {
                if let Some(caps) = rule.captures(input) {
                    let expr = caps.get(1).map(|m| m.as_str()).unwrap_or("");
                    if let Some(dt) = parse_date_expr(expr, now.date_naive()) {
                        task.deadline_at = Some(dt);
                        mask_range(&mut title_mask, span.start, span.end);
                    }
                }
            }
            "duration_minutes" => {
                if let Some(caps) = rule.captures(input) {
                    let amount: u32 = caps.get(1)
                        .and_then(|m| m.as_str().parse().ok())
                        .unwrap_or(0);
                    let unit = caps.get(2).map(|m| m.as_str()).unwrap_or("min");
                    let minutes = if unit.starts_with('h') { amount * 60 } else { amount };
                    if minutes > 0 {
                        task.duration_minutes = Some(minutes);
                        mask_range(&mut title_mask, span.start, span.end);
                    }
                }
            }
            "priority" => {
                let priority = match rule.rule.value.as_deref() {
                    Some("urgent") => Priority::Urgent,
                    Some("high") => Priority::High,
                    Some("low") => Priority::Low,
                    _ => Priority::Medium,
                };
                task.priority = priority;
                mask_range(&mut title_mask, span.start, span.end);
            }
            _ => {}
        }

        spans.push(span);
    }

    // Extract hashtags directly — supports multiple tags per input
    let tag_re = regex::Regex::new(r"#([a-zA-Z][a-zA-Z0-9_-]*)").unwrap();
    for cap in tag_re.captures_iter(input) {
        let full = cap.get(0).unwrap();
        let start = full.start();
        let end = full.end();
        // Skip if already masked by another rule
        if title_mask[start..end].iter().any(|&m| m) {
            task.tags.push(cap[1].to_string());
            spans.push(Span { start, end, kind: crate::types::SpanKind::Tag });
            mask_range(&mut title_mask, start, end);
        }
    }

    // Build title by removing matched regions
    task.title = build_title(input, &title_mask);
    task.spans = spans;
    task
}

fn load_rules() -> Result<Vec<CompiledRule>> {
    let rule_set = RuleSet::from_toml(TASK_RULES_TOML)?;
    rule_set.rules.into_iter()
        .map(CompiledRule::compile)
        .collect()
}

fn mask_range(mask: &mut Vec<bool>, start: usize, end: usize) {
    for i in start..end.min(mask.len()) {
        mask[i] = false;
    }
}

fn build_title(input: &str, mask: &[bool]) -> String {
    let mut title = String::new();
    let chars: Vec<char> = input.chars().collect();
    let mut i = 0;
    for ch in chars {
        if i < mask.len() && mask[i] {
            title.push(ch);
        }
        i += ch.len_utf8();
    }
    title.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn parse_time_str(s: &str, date: NaiveDate) -> Option<DateTime<Utc>> {
    let s = s.trim().to_lowercase();
    // Try formats: "3pm", "3:30pm", "15:00", "3"
    let (hour, minute, is_pm) = parse_time_components(&s)?;
    let hour = if is_pm && hour < 12 { hour + 12 } else if !is_pm && hour == 12 { 0 } else { hour };
    let time = NaiveTime::from_hms_opt(hour, minute, 0)?;
    date_time_to_utc(date, time)
}

fn parse_time_components(s: &str) -> Option<(u32, u32, bool)> {
    let is_pm = s.contains("pm");
    let is_am = s.contains("am");
    let s = s.replace("am", "").replace("pm", "").trim().to_string();

    if s.contains(':') {
        let parts: Vec<&str> = s.split(':').collect();
        let hour: u32 = parts.first()?.trim().parse().ok()?;
        let minute: u32 = parts.get(1)?.trim().parse().ok()?;
        Some((hour, minute, is_pm))
    } else {
        let hour: u32 = s.trim().parse().ok()?;
        Some((hour, 0, is_pm || (!is_am && hour < 8)))
    }
}

fn parse_date_str(s: &str, today: NaiveDate) -> Option<NaiveDate> {
    let s = s.to_lowercase();
    let s = s.trim_start_matches("this").trim_start_matches("next").trim();

    match s {
        "today" => Some(today),
        "tomorrow" => today.succ_opt(),
        weekday => {
            let target = parse_weekday(weekday)?;
            let current = today.weekday();
            let days_ahead = days_until(current, target);
            let days = if s.contains("next") { days_ahead + 7 } else { days_ahead };
            today.checked_add_days(chrono::Days::new(days as u64))
        }
    }
}

fn parse_date_expr(s: &str, today: NaiveDate) -> Option<DateTime<Utc>> {
    let date = parse_date_str(s, today)?;
    date_time_to_utc(date, NaiveTime::from_hms_opt(17, 0, 0)?)
}

fn date_time_to_utc(date: NaiveDate, time: NaiveTime) -> Option<DateTime<Utc>> {
    Local.from_local_datetime(&date.and_time(time)).single()
        .map(|dt| dt.with_timezone(&Utc))
}

fn parse_weekday(s: &str) -> Option<Weekday> {
    match s.to_lowercase().as_str() {
        "monday" | "mon" => Some(Weekday::Mon),
        "tuesday" | "tue" => Some(Weekday::Tue),
        "wednesday" | "wed" => Some(Weekday::Wed),
        "thursday" | "thu" => Some(Weekday::Thu),
        "friday" | "fri" => Some(Weekday::Fri),
        "saturday" | "sat" => Some(Weekday::Sat),
        "sunday" | "sun" => Some(Weekday::Sun),
        _ => None,
    }
}

fn days_until(from: Weekday, to: Weekday) -> u32 {
    let from_num = from.num_days_from_monday();
    let to_num = to.num_days_from_monday();
    if to_num > from_num { to_num - from_num }
    else { 7 - from_num + to_num }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_time_parsing() {
        let result = parse("take out trash at 3pm");
        assert!(result.scheduled_at.is_some());
        assert_eq!(result.title, "take out trash");
        assert!(!result.spans.is_empty());
    }

    #[test]
    fn test_deadline_parsing() {
        let result = parse("finish report by Friday");
        assert!(result.deadline_at.is_some());
    }

    #[test]
    fn test_duration_parsing() {
        let result = parse("call dentist tomorrow 2pm for 30 minutes");
        assert_eq!(result.duration_minutes, Some(30));
        assert!(result.scheduled_at.is_some());
    }

    #[test]
    fn test_priority_high() {
        let result = parse("high priority fix login bug");
        assert_eq!(result.priority, Priority::High);
    }

    #[test]
    fn test_priority_urgent() {
        let result = parse("urgent fix the outage");
        assert_eq!(result.priority, Priority::Urgent);
    }

    #[test]
    fn test_hours_duration() {
        let result = parse("deep work session for 2 hours");
        assert_eq!(result.duration_minutes, Some(120));
    }

    #[test]
    fn test_no_match_preserves_title() {
        let result = parse("buy groceries");
        assert_eq!(result.title, "buy groceries");
        assert!(result.spans.is_empty());
    }
}

#[cfg(test)]
mod extra_tests {
    use super::*;
    use chrono::Timelike;
    #[test]
    fn test_on_5pm_friday() {
        let result = parse("do this on 5pm friday");
        assert!(result.scheduled_at.is_some(), "should parse scheduled_at");
        let dt = result.scheduled_at.unwrap().with_timezone(&chrono::Local);
        assert_eq!(dt.hour(), 17, "hour should be 17 (5pm)");
        println!("title={:?} dt={}", result.title, dt);
    }
    #[test]
    fn test_bare_time() {
        let result = parse("meeting 3pm tomorrow");
        assert!(result.scheduled_at.is_some());
        let dt = result.scheduled_at.unwrap().with_timezone(&chrono::Local);
        assert_eq!(dt.hour(), 15, "hour should be 15 (3pm)");
    }
    #[test]
    fn test_hashtag_extracted() {
        let result = parse("buy groceries #errands #home");
        assert_eq!(result.tags, vec!["errands", "home"]);
        assert_eq!(result.title.trim(), "buy groceries");
    }
}
