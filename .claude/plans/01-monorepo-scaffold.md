# Phase 1 — Monorepo Scaffold

## Goal
Turn the current bare repo into a fully wired Cargo workspace + npm workspace, ready for all subsequent phases.

## Steps

### 1.1 Cargo Workspace Root (`Cargo.toml`)
```toml
[workspace]
members = [
  "apps/desktop",
  "packages/til-core",
  "packages/til-sync",
]
resolver = "2"

[workspace.dependencies]
# pin shared deps here for consistency
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chrono = { version = "0.4", features = ["serde"] }
regex = "1"
anyhow = "1"
tracing = "0.1"
```

### 1.2 npm Workspace Root (`package.json`)
```json
{
  "name": "til-monorepo",
  "private": true,
  "workspaces": ["apps/mobile", "packages/til-types"]
}
```

### 1.3 Directory skeleton
```
apps/desktop/src/main.rs          (stub)
apps/desktop/Cargo.toml
apps/mobile/app/(tabs)/tasks.tsx  (stub)
apps/mobile/app/(tabs)/calendar.tsx
apps/mobile/package.json
packages/til-core/src/lib.rs      (stub)
packages/til-core/Cargo.toml
packages/til-sync/src/lib.rs      (stub)
packages/til-sync/Cargo.toml
packages/til-types/src/index.ts   (stub)
packages/til-types/package.json
supabase/migrations/.gitkeep
supabase/functions/.gitkeep
supabase/seed.sql                 (empty)
```

### 1.4 Supabase CLI init
```bash
supabase init          # inside supabase/
supabase link --project-ref <ref>   # needs SUPABASE_URL
```

### 1.5 Verification
- `cargo check --workspace` passes
- `npm install` from root installs all workspaces
- Directory tree matches spec

## Outputs
- `Cargo.toml` workspace root
- `package.json` workspace root
- All stub files in place
- `.gitignore` covers all generated artifacts
