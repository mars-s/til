# Phase 4 — Desktop App: Tasks Tab

## Goal
GPUI desktop app with a Things 3-style task list. Local state only in this phase — sync wired in Phase 7.

## Crate deps (`apps/desktop/Cargo.toml`)
```toml
[dependencies]
gpui = { git = "https://github.com/zed-industries/zed", package = "gpui" }
til-core = { path = "../../packages/til-core" }
tokio = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
anyhow = { workspace = true }
tracing = { workspace = true }
tracing-subscriber = "0.3"
```

## AppState (`src/state/store.rs`)
```rust
pub struct AppModel {
    pub tasks: Vec<Task>,
    pub calendars: Vec<Calendar>,
    pub events: Vec<CalendarEvent>,
    pub active_tab: Tab,
    pub input_draft: String,
    pub command_palette_open: bool,
    pub selected_task_id: Option<Uuid>,
}

pub enum Tab { Tasks, Calendar }

// Action enum — all mutations go through here
pub enum Action {
    SetInput(String),
    SubmitInput,
    ToggleTask(Uuid),
    SetTaskInProgress(Uuid),
    DeleteTask(Uuid),
    SwitchTab(Tab),
    OpenCommandPalette,
    CloseCommandPalette,
}
```

## View tree
```
RootView
├── TabBar (Tasks | Calendar)
├── TasksView         (active_tab == Tasks)
│   ├── TaskInput     ← NLP-aware, real-time span highlighting
│   └── TaskList
│       └── TaskRow[] ← expandable, long-press tick
└── CalendarView      (active_tab == Calendar) ← Phase 5
```

## TaskInput behaviour
1. As user types, call `til_core::nlp::task::parse(input)` on every keystroke
2. Render coloured chips over matched spans (Time=blue, Priority=orange, Date=green, Duration=purple)
3. On Enter → dispatch `Action::SubmitInput` → creates task from `ParsedTask`
4. Clear input after submit

## TaskRow
- Single-click → expand description
- Hover tick → animate fill; click → mark done
- Long-hold tick (500ms) → mark `in_progress` (amber colour)
- Swipe left (trackpad) → delete with undo toast

## Theming (`src/theme.rs`)
```rust
pub struct TilTheme {
    pub bg: Hsla,
    pub surface: Hsla,
    pub text_primary: Hsla,
    pub text_secondary: Hsla,
    pub accent: Hsla,
    pub span_time: Hsla,
    pub span_date: Hsla,
    pub span_priority: Hsla,
    pub span_duration: Hsla,
    pub task_done: Hsla,
    pub task_in_progress: Hsla,
}
```

## Keybinds (global, registered in `app.rs`)
- `cmd+n` → focus task input
- `cmd+k` → open command palette (Phase 8)
- `tab` → switch between Tasks / Calendar tabs
- `escape` → close palette / blur input

## Milestone
`cargo run -p desktop` shows a working task list: type NLP input, press Enter, task appears with coloured spans, tick to complete.
