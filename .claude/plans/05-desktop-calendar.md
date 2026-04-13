# Phase 5 — Desktop App: Calendar Tab

## Goal
Week and month calendar views in the Tauri 2.0 desktop app. Web UI built with React. Local events only; Google sync in Phase 7.

## Views

### WeekView (`src/views/calendar/Week.tsx`)
- 7-column horizontal grid, 24 rows (hours) with CSS Grid/Flexbox
- Trackpad horizontal scroll between weeks
- Events rendered as coloured blocks
- **Dashed outline** for `is_suggestion = true` events
- Click on time slot → open NLP event creation input (same engine as tasks)
- `1–7` keys → jump focus to day column

### MonthView (`src/views/calendar/Month.tsx`)
- Standard month grid
- Shows event dots / short titles
- Click day → expand week view at that week

### EventBlock (`src/components/EventBlock.tsx`)
```tsx
interface EventBlockProps {
    event: CalendarEvent;
    isSuggestion: boolean;   // Dashed (suggestion) vs Solid
    isFocused: boolean;
}
```
- Solid: confirmed event
- Dashed / ghost: `is_suggestion = true` — clicking commits it (Phase 10)

## NLP Event Input
Same input component as tasks but calls Tauri command `invoke('parse_calendar', { input })` using `til_core::nlp::calendar::parse()`.
Inline span highlights for time, date, recurrence patterns.

## Keybinds
- `w` → week view
- `m` → month view
- `t` → jump to today
- `1–7` → day columns (week view)
- `←` / `→` → previous / next week (or month)
- `cmd+k` → command palette (Phase 8)

## State additions to Backend/Frontend
```tsx
const [calendarView, setCalendarView] = useState<'Week' | 'Month'>('Week');
const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
```

## Horizontal scroll
Utilize native web CSS overflow-x scrolling on the week grid container, snapping or triggering navigation on edges.

## Milestone
`npm run tauri dev`, switch to Calendar tab. Can create events via NLP input. Week/month toggle works. Dashed suggestion blocks render correctly.
