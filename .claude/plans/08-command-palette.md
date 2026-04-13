# Phase 8 — Command Palette (cmd+k)

## Goal
Global command palette accessible from anywhere in the desktop app via `cmd+k`. All major actions wired.

## Component (`src/views/command_palette/mod.rs`)
```
CommandPalette
├── SearchInput      ← fuzzy search
├── CommandList
│   └── CommandItem[]
└── Preview pane     (optional, for context)
```

## Command registry
```rust
pub struct Command {
    pub id: &'static str,
    pub label: &'static str,
    pub keywords: &'static [&'static str],
    pub icon: Option<Icon>,
    pub action: CommandAction,
}

pub enum CommandAction {
    CreateTask,
    CreateEvent,
    NavigateTasks,
    NavigateCalendar,
    BindCalendar,
    SignOut,
    OpenSettings,
    ScheduleTask(Uuid),        // from selected task
    JumpToDate(NaiveDate),
}
```

## Commands list (v1)
| Label | Keywords | Action |
|-------|----------|--------|
| New Task | task, add, create | CreateTask |
| New Event | event, calendar | CreateEvent |
| Go to Tasks | tasks, list | NavigateTasks |
| Go to Calendar | calendar, week | NavigateCalendar |
| Connect Google Calendar | connect, google, bind | BindCalendar |
| Jump to Today | today, now | JumpToDate(today) |
| Sign Out | logout, signout | SignOut |

## Fuzzy search
Use simple trigram or prefix match over `label + keywords`. No external dep needed.

## UX
- Opens with `cmd+k` from any view
- `↑` / `↓` to navigate, `Enter` to execute, `Escape` to close
- Animate in (opacity + slight y-translate) using GPUI transitions
- Positioned center-top of window (Raycast style)

## Integration with NLP input
If the palette is opened while a task is selected → pre-fill "Schedule Task {title}" as the top command.

## Milestone
`cmd+k` opens palette. All 7 default commands work. Fuzzy search filters correctly.
