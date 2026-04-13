# Til — Full Architecture Specification

## Monorepo Structure

```
til/
├── apps/
│   ├── desktop/                    # Tauri 2.0 (React + Rust) — macOS/Windows/Linux
│   └── mobile/                     # Expo + React Native — iOS
├── packages/
│   ├── til-core/                   # Shared Rust logic (WASM compilable)
│   │   ├── nlp/                    # Regex NLP engine (tasks + calendar)
│   │   ├── scheduler/              # Smart scheduling algorithm
│   │   └── types/                  # Shared domain types
│   ├── til-sync/                   # Supabase sync client (Rust)
│   └── til-types/                  # TypeScript types mirroring Rust structs
├── supabase/
│   ├── migrations/
│   ├── functions/
│   │   ├── google-calendar-webhook/
│   │   ├── token-refresh/
│   │   └── smart-schedule/         # AI scheduling edge function
│   └── seed.sql
└── Cargo.toml                      # Workspace root
```

---

## Layer Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    til-core (Rust)                       │
│  ┌─────────────────┐  ┌──────────────────────────────┐  │
│  │   NLP Engine    │  │    Smart Scheduler           │  │
│  │  (regex rules)  │  │  (gap detection + ranking)   │  │
│  └─────────────────┘  └──────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ compiled to native + WASM
            ┌────────────┴────────────┐
            ▼                        ▼
   ┌────────────────┐      ┌──────────────────────┐
   │ Tauri Desktop  │      │  Expo Mobile (RN)    │
   │                │      │                      │
   │  Tasks tab     │      │  Tasks screen        │
   │  Calendar tab  │      │  Calendar screen     │
   │  cmd+k global  │      │  Liquid Glass UI     │
   └───────┬────────┘      └──────────┬───────────┘
           │                          │
           └──────────┬───────────────┘
                      ▼
           ┌──────────────────────┐
           │      Supabase        │
           │                      │
           │  Auth (Google OAuth) │
           │  Postgres DB         │
           │  Realtime            │
           │  Edge Functions      │
           └──────────┬───────────┘
                      │
                      ▼
           ┌──────────────────────┐
           │   Google Calendar    │
           │   API + Webhooks     │
           └──────────────────────┘
```

---

## Database Schema (Supabase Postgres)

```sql
-- Core task entity
tasks (
  id uuid PK,
  user_id uuid FK,
  title text,
  description text,
  status enum(todo, in_progress, done),
  priority enum(low, medium, high, urgent),
  scheduled_at timestamptz,        -- parsed from NLP
  deadline_at timestamptz,
  duration_minutes int,            -- for smart scheduler
  tags text[],
  calendar_event_id text,          -- Google Cal event ID if synced
  created_at, updated_at
)

-- Calendar sources
calendars (
  id uuid PK,
  user_id uuid FK,
  name text,                       -- "Til", "Work", etc.
  google_calendar_id text,
  color text,
  is_primary bool,                 -- the auto-created "Til" calendar
  sync_token text                  -- Google incremental sync token
)

-- Raw Google Calendar events mirror
calendar_events (
  id uuid PK,
  calendar_id uuid FK,
  google_event_id text,
  title text,
  start_at timestamptz,
  end_at timestamptz,
  is_task_block bool,              -- true if created by smart scheduler
  is_suggestion bool,              -- dashed = not committed
  raw_json jsonb
)

-- OAuth tokens (server-side only, never exposed to client)
user_tokens (
  user_id uuid PK,
  google_access_token text encrypted,
  google_refresh_token text encrypted,
  expires_at timestamptz
)
```

---

## til-core NLP Engine

Single crate, compiles to native (desktop) and WASM (mobile via wasm-bindgen).

### Task NLP — Regex Rules

```
"take out trash at 3pm"
  → title: "take out trash"
  → scheduled_at: today@15:00

"finish report by Friday 5pm"
  → deadline_at: this_friday@17:00

"call dentist tomorrow 2pm for 30 mins"
  → scheduled_at: tomorrow@14:00
  → duration_minutes: 30

"high priority fix login bug"
  → priority: high
```

Rules fire sequentially, each returning a `Span { start, end, kind }` for inline
highlighting. The UI renders coloured chips around matched spans in real-time as
you type.

### Calendar NLP — same engine, different rule set

```
"meeting at 1pm to 2pm Tuesday"
  → start: tuesday@13:00, end: tuesday@14:00

"lunch with Alex next Thursday noon"
  → start: next_thursday@12:00, duration: inferred 60min

"standup every weekday 9am"
  → recurrence: RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR
```

Use `chrono` + `regex` crates. Keep rules in a declarative config (TOML) so they
are easy to extend without recompiling.

---

## Desktop App — Tauri 2.0 Architecture

```
apps/desktop/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs         # Entry point, Tauri setup
│   │   ├── commands.rs     # Tauri IPC commands wrapping til-core
│   │   ├── state.rs        # Managed backend state (Mutex)
│   │   └── sync/           # Supabase push/pull
│   └── Cargo.toml
├── src/
│   ├── main.tsx            # React entry
│   ├── App.tsx             # Root Layout (Tabs, CmdK provider)
│   ├── components/         # Reusable UI (TaskRow, Input, etc)
│   ├── views/
│   │   ├── Tasks.tsx       # Things 3 style tasks
│   │   └── Calendar.tsx    # Week/Month grid views
│   └── lib/                # tauri invoke wrappers, hooks
├── package.json
└── tailwind.config.js      # Styling framework
```

### Key Interactions
- `cmd+k` → React command palette (`cmdk`) via global window events (create task, create event, navigate, bind calendar)
- `w` / `m` → toggle week / month view
- native trackpad scrolling on calendar via css overflow
- Backend performs heavy lifting and DB/syncing, Frontend strictly handles view logic and calls `invoke()`.

### Theming
Tailwind CSS provides the design tokens. Define colors and font variables in `index.css` and use standard functional utility classes in React components.

---

## Mobile App — Expo Architecture

```
apps/mobile/
├── app/
│   ├── (tabs)/
│   │   ├── tasks.tsx
│   │   └── calendar.tsx
├── components/
│   ├── TaskRow.tsx          # mirrors desktop behaviour
│   ├── CalendarGrid.tsx     # horizontal scroll, same layout
│   ├── NLPInput.tsx         # calls til-core WASM for span detection
│   └── LiquidGlassNav.tsx   # iOS 26 Liquid Glass tab bar + modals
├── lib/
│   ├── supabase.ts
│   ├── til-core.wasm        # compiled from Rust til-core
│   └── google-calendar.ts
```

### Liquid Glass
iOS 26 exposes `UIVisualEffectView` with the liquid glass material. In RN this is
via a native module — `react-native-blur` initially, with a proper native module
once the iOS 26 SDK settles. Tab bar, modals, and task cards get the glass
treatment.

### til-core in Mobile
Compile `til-core` to WASM via `wasm-pack`. Call it from JS with wasm-bindgen
generated bindings. NLP parsing stays consistent across platforms with zero
duplication.

---

## Google Calendar Sync Flow

```
First login:
  1. Supabase Auth Google OAuth
  2. Edge fn: create "Til" calendar via Google Cal API
  3. Store calendar ID in calendars table
  4. Full sync: pull all events → calendar_events table
  5. Register webhook push channel with Google

Ongoing:
  Google → POST /functions/google-calendar-webhook
         → upsert calendar_events
         → Supabase Realtime broadcasts change
         → Desktop + mobile receive update

Task → Calendar:
  Create task with scheduled_at
  → Edge fn creates Google Calendar event in "Til" calendar
  → Stores event ID back on task row
```

---

## Smart Scheduler

Runs as both a local heuristic (fast, offline) and an AI-enhanced version (calls
Claude via edge function).

### Local Heuristic (til-core/scheduler)
1. Load all calendar events for the next 14 days
2. Find free gaps >= task duration
3. Score gaps: prefer morning for high priority, match historical patterns, avoid
   back-to-back blocks
4. Return top 3 `Suggestion { start, end, confidence, reason }`

### AI-Enhanced (Supabase Edge Function)

```
POST /functions/smart-schedule
{
  task: { title, description, duration, priority, tags },
  free_slots: [...],
  preferences: { work_hours, focus_time }
}
→ Claude analyzes task semantics + slots
→ Returns ranked suggestions with natural language reason:
  "Tuesday 10am — good focus block, matches deep work pattern"
```

Suggestions render in the calendar as dashed-outline blocks. Clicking one commits
it (solid block + creates Google Cal event).

---

## AI-Friendliness (Vibe Coding)

- **til-core is pure logic, zero UI** — NLP rules and scheduler can be rewritten
  without touching rendering code
- **Declarative NLP rules in TOML** — describe a new pattern, AI generates the rule
- **Supabase types auto-generated** — `supabase gen types typescript` keeps
  `til-types` in sync; AI always has accurate schema context
- **React Frontend / Tauri Backend split** — frontend UI updates easily driven by AI and decoupled from DB logic.
- **Edge functions are small and isolated** — each is a standalone Deno function,
  trivial to hand to AI for modification

---

## Tech Stack Summary

| Layer | Tech |
|---|---|
| Desktop | Tauri 2.0 (React/TypeScript UI + Rust Backend) |
| Mobile | Expo + React Native — iOS |
| Shared logic | til-core (Rust → native + WASM) |
| Backend | Supabase (Auth, Postgres, Realtime, Edge Functions) |
| Google Cal sync | Edge Functions + webhook push |
| NLP | Rust regex + chrono, TOML rule config |
| AI scheduling | Claude via Anthropic API (edge function) |
| Monorepo | Cargo workspace + npm workspaces |

---

## Implementation Order (Suggested)

1. **Scaffold monorepo** — Cargo workspace, npm workspaces, Supabase project init
2. **til-core NLP** — task parser with span highlighting, TOML rules, unit tests
3. **Supabase schema** — migrations, RLS policies, type generation
4. **Desktop tasks tab** — React UI, Tauri Commands, Local state
5. **Desktop calendar tab** — week grid, keybinds, horizontal scroll
6. **Auth + Google OAuth** — Supabase auth, token storage, "Til" calendar creation
7. **Sync layer** — webhook edge function, Realtime subscriptions, bidirectional sync
8. **cmd+k command palette** — global shortcut via `cmdk`, all actions wired
9. **Mobile app** — Expo scaffold, reuse til-core WASM, Liquid Glass UI
10. **Smart scheduler** — local heuristic first, then AI edge function, dashed
    suggestion blocks in calendar
