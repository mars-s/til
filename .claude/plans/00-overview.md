# Til — Master Implementation Plan

## What we're building
A cross-platform productivity app: Things 3-style tasks + Google Calendar, with NLP input, smart scheduling, and real-time sync. Desktop = GPUI (Rust/macOS). Mobile = Expo/iOS. Shared logic = `til-core` Rust crate (compiles to native + WASM).

## Phase Order

| Phase | Plan | Agent | Status |
|-------|------|-------|--------|
| 1 | [Monorepo Scaffold](01-monorepo-scaffold.md) | — | pending |
| 2 | [til-core NLP](02-til-core-nlp.md) | [nlp-agent](../agents/nlp-agent.md) | pending |
| 3 | [Supabase Schema](03-supabase-schema.md) | [supabase-agent](../agents/supabase-agent.md) | pending |
| 4 | [Desktop — Tasks Tab](04-desktop-tasks.md) | [desktop-agent](../agents/desktop-agent.md) | pending |
| 5 | [Desktop — Calendar Tab](05-desktop-calendar.md) | [desktop-agent](../agents/desktop-agent.md) | pending |
| 6 | [Auth + Google OAuth](06-auth-google-oauth.md) | [supabase-agent](../agents/supabase-agent.md) | pending |
| 7 | [Sync Layer](07-sync-layer.md) | [sync-agent](../agents/sync-agent.md) | pending |
| 8 | [Command Palette](08-command-palette.md) | [desktop-agent](../agents/desktop-agent.md) | pending |
| 9 | [Mobile App](09-mobile-app.md) | [mobile-agent](../agents/mobile-agent.md) | pending |
| 10 | [Smart Scheduler](10-smart-scheduler.md) | [scheduler-agent](../agents/scheduler-agent.md) | pending |

## Dependency Graph

```
Phase 1 (Scaffold)
  └── Phase 2 (NLP)          ← pure Rust, no deps
  └── Phase 3 (Supabase)     ← needs Supabase keys from user
        └── Phase 6 (Auth)
              └── Phase 7 (Sync)
  └── Phase 4 (Desktop Tasks) ← depends on Phase 2 + 3
        └── Phase 5 (Calendar)
              └── Phase 8 (cmd+k)
  └── Phase 9 (Mobile)        ← depends on Phase 2 (WASM) + Phase 3
  └── Phase 10 (Scheduler)    ← depends on all of the above
```

## Keys / Secrets Needed from User (before Phase 3+)

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service role secret key>
SUPABASE_DB_PASSWORD=<database password>
GOOGLE_CLIENT_ID=<oauth client id>
GOOGLE_CLIENT_SECRET=<oauth client secret>
ANTHROPIC_API_KEY=<for smart-schedule edge function>
```

## Monorepo Layout

```
til/
├── apps/
│   ├── desktop/           # GPUI Rust
│   └── mobile/            # Expo + React Native
├── packages/
│   ├── til-core/          # Shared Rust logic
│   ├── til-sync/          # Supabase sync client (Rust)
│   └── til-types/         # TypeScript types
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── seed.sql
├── Cargo.toml             # workspace root
├── package.json           # npm workspace root
└── .gitignore
```
