# Phase 2 — til-core NLP Engine

## Goal
Implement the shared NLP parser in `packages/til-core`. No UI, no network. Pure Rust logic that compiles to both native and WASM.

## Crate structure
```
packages/til-core/
├── Cargo.toml
├── rules/
│   ├── tasks.toml       # task NLP rules (declarative)
│   └── calendar.toml    # calendar NLP rules
└── src/
    ├── lib.rs
    ├── types.rs         # ParsedTask, ParsedEvent, Span, Priority, Status
    ├── nlp/
    │   ├── mod.rs
    │   ├── engine.rs    # loads TOML rules, runs regex pipeline
    │   ├── task.rs      # task-specific rule application
    │   └── calendar.rs  # calendar-specific rule application
    ├── scheduler/
    │   ├── mod.rs
    │   └── heuristic.rs # gap detection + scoring (Phase 10)
    └── wasm.rs          # wasm-bindgen exports (cfg = wasm32)
```

## Core Types (`types.rs`)
```rust
pub struct Span {
    pub start: usize,
    pub end: usize,
    pub kind: SpanKind,       // Time, Date, Duration, Priority, etc.
}

pub struct ParsedTask {
    pub title: String,
    pub scheduled_at: Option<DateTime<Utc>>,
    pub deadline_at: Option<DateTime<Utc>>,
    pub duration_minutes: Option<u32>,
    pub priority: Priority,
    pub tags: Vec<String>,
    pub spans: Vec<Span>,     // for real-time highlighting
}

pub struct ParsedEvent {
    pub title: String,
    pub start_at: DateTime<Utc>,
    pub end_at: Option<DateTime<Utc>>,
    pub duration_minutes: Option<u32>,
    pub rrule: Option<String>,
    pub spans: Vec<Span>,
}

pub enum Priority { Low, Medium, High, Urgent }
pub enum SpanKind { Time, Date, Duration, Priority, Tag, Recurrence }
```

## NLP Rule Format (`rules/tasks.toml`)
```toml
[[rules]]
name = "time_at"
pattern = "(?i)\\bat\\s+(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm))"
captures = ["time"]
sets = "scheduled_at"
span_kind = "Time"

[[rules]]
name = "deadline_by"
pattern = "(?i)\\bby\\s+((?:monday|tuesday|...|today|tomorrow)(?:\\s+\\d{1,2}(?::\\d{2})?\\s*(?:am|pm))?)"
captures = ["date_expr"]
sets = "deadline_at"
span_kind = "Date"

[[rules]]
name = "duration_for"
pattern = "(?i)\\bfor\\s+(\\d+)\\s*(min(?:utes?)?|h(?:ours?)?)"
captures = ["amount", "unit"]
sets = "duration_minutes"
span_kind = "Duration"

[[rules]]
name = "priority_high"
pattern = "(?i)\\b(high|urgent|asap)\\s+priority\\b|\\bpriority\\s+(high|urgent)\\b"
sets = "priority"
value = "high"
span_kind = "Priority"
```

## WASM Export (`wasm.rs`)
```rust
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn parse_task(input: &str) -> JsValue {
    let result = crate::nlp::task::parse(input);
    serde_wasm_bindgen::to_value(&result).unwrap()
}
```

## Build targets
- Native: `cargo build -p til-core`
- WASM: `wasm-pack build packages/til-core --target web --out-dir ../../apps/mobile/lib/til-core`

## Tests
Unit tests for each rule pattern with at least 3 examples per rule.

## Cargo.toml deps
```toml
[dependencies]
regex = "1"
chrono = { version = "0.4", features = ["serde"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
toml = "0.8"
anyhow = "1"

[target.'cfg(target_arch = "wasm32")'.dependencies]
wasm-bindgen = "0.2"
serde-wasm-bindgen = "0.6"

[lib]
crate-type = ["cdylib", "rlib"]
```
