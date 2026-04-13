# Phase 4 — Desktop App: Tasks Tab

## Goal
Tauri 2.0 desktop app with a Things 3-style task list. Web UI built with React, TypeScript, and Tailwind CSS. State management through Tauri commands with Rust backend. Local state only in this phase — sync wired in Phase 7.

## Tauri setup (`apps/desktop/src-tauri/Cargo.toml`)
```toml
[dependencies]
tauri = { version = "2.0", features = [] }
til-core = { path = "../../../packages/til-core" }
tokio = { workspace = true }
serde = { workspace = true }
serde_json = { workspace = true }
anyhow = { workspace = true }
```

## AppState (`src-tauri/src/state.rs`)
```rust
use std::sync::Mutex;

pub struct AppState {
    pub tasks: Mutex<Vec<Task>>,
    pub calendars: Mutex<Vec<Calendar>>,
    pub events: Mutex<Vec<CalendarEvent>>,
}

#[tauri::command]
pub async fn get_tasks(state: tauri::State<'_, AppState>) -> Result<Vec<Task>, String> {
    Ok(state.tasks.lock().unwrap().clone())
}

#[tauri::command]
pub async fn toggle_task(id: Uuid, state: tauri::State<'_, AppState>) -> Result<(), String> {
    // Modify task
    Ok(())
}
```

## View tree (React)
```
RootView
├── TabBar (Tasks | Calendar)
├── TasksView         (active_tab == Tasks)
│   ├── TaskInput     ← Calls Tauri command for NLP parsing, real-time span highlighting
│   └── TaskList
│       └── TaskRow[] ← expandable, long-press tick
└── CalendarView      (active_tab == Calendar) ← Phase 5
```

## TaskInput behaviour
1. As user types, call `invoke('parse_task', { input })` to `til_core::nlp::task::parse(input)`
2. Render coloured chips over matched spans (Time=blue, Priority=orange, Date=green, Duration=purple)
3. On Enter → dispatch `create_task` Tauri command
4. Clear input after submit

## TaskRow
- Single-click → expand description
- Hover tick → animate fill; click → mark done
- Long-hold tick (500ms) → mark `in_progress` (amber colour)
- Swipe left (trackpad) → delete with undo toast

## Theming (`src/index.css`)
```css
:root {
  --bg: #1e1e1e;
  --surface: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #aaaaaa;
  --accent: #007bff;
  --span-time: #3b82f6;
  --span-date: #10b981;
  --span-priority: #f59e0b;
  --span-duration: #8b5cf6;
}
```

## Keybinds (using global event listeners in React or Tauri global shortcuts)
- `cmd+n` → focus task input
- `cmd+k` → open command palette (Phase 8)
- `tab` → switch between Tasks / Calendar tabs
- `escape` → close palette / blur input

## Milestone
`npm run tauri dev` shows a working task list: type NLP input, press Enter, task appears with coloured spans, tick to complete.
