# Phase 5 — Desktop App: Calendar Tab

## Goal
Week and month calendar views in the GPUI desktop app. Local events only; Google sync in Phase 7.

## Views

### WeekView (`src/views/calendar/week.rs`)
- 7-column horizontal grid, 24 rows (hours)
- Trackpad horizontal scroll between weeks
- Events rendered as coloured blocks
- **Dashed outline** for `is_suggestion = true` events
- Click on time slot → open NLP event creation input (same engine as tasks)
- `1–7` keys → jump focus to day column

### MonthView (`src/views/calendar/month.rs`)
- Standard month grid
- Shows event dots / short titles
- Click day → expand week view at that week

### EventBlock (`src/views/calendar/event.rs`)
```rust
pub struct EventBlock {
    pub event: CalendarEvent,
    pub style: EventStyle,      // Solid | Dashed (suggestion)
    pub is_focused: bool,
}
```
- Solid: confirmed event
- Dashed / ghost: `is_suggestion = true` — clicking commits it (Phase 10)

## NLP Event Input
Same input component as tasks but uses `til_core::nlp::calendar::parse()`.
Inline span highlights for time, date, recurrence patterns.

## Keybinds
- `w` → week view
- `m` → month view
- `t` → jump to today
- `1–7` → day columns (week view)
- `←` / `→` → previous / next week (or month)
- `cmd+k` → command palette (Phase 8)

## State additions to AppModel
```rust
pub struct AppModel {
    // ... existing fields
    pub calendar_view: CalendarView,   // Week | Month
    pub week_offset: i32,              // 0 = current week
    pub focused_day: Option<NaiveDate>,
}

pub enum CalendarView { Week, Month }
```

## Horizontal scroll
GPUI scroll handling on the week grid — `ScrollHandle` on the time axis, week navigation updates `week_offset`.

## Milestone
`cargo run -p desktop`, press Tab → Calendar tab. Can create events via NLP input. Week/month toggle works. Dashed suggestion blocks render correctly.
