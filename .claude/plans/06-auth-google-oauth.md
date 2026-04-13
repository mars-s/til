# Phase 6 — Auth + Google OAuth

## Goal
Supabase Auth with Google provider. On first login: create the "Til" calendar in Google Calendar, register a webhook, store tokens.

## Supabase Auth setup
1. Enable Google provider in Supabase dashboard
2. Set redirect URLs for desktop app (deep link: `til://auth/callback`)
3. Store `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Supabase secrets

## Desktop auth flow (`src/auth/`)
```rust
// Open browser → Google OAuth → deep link callback → exchange code
pub async fn start_oauth_flow() -> Result<Session>

// Store session in OS keychain (via `keyring` crate)
pub fn save_session(session: &Session) -> Result<()>
pub fn load_session() -> Result<Option<Session>>
```

## Edge Function: `supabase/functions/auth-callback/index.ts`
Handles the server-side token exchange and stores encrypted tokens in `user_tokens`.

## Edge Function: `supabase/functions/token-refresh/index.ts`
```typescript
// Cron or on-demand: refresh Google access token before expiry
// Updates user_tokens.google_access_token + expires_at
```

## Edge Function: `supabase/functions/google-calendar-setup/index.ts`
Runs once after first login:
```typescript
1. Create "Til" calendar via Google Calendar API
2. Insert row into calendars table (is_primary = true)
3. Full sync: list all user calendars + events → calendar_events table
4. Register push channel (webhook) with Google:
   POST https://www.googleapis.com/calendar/v3/calendars/{id}/events/watch
   { id: uuid, type: "web_hook", address: WEBHOOK_URL }
5. Store resource_id + expiration for renewal
```

## Database additions
```sql
alter table calendars add column webhook_resource_id text;
alter table calendars add column webhook_expiration timestamptz;
```

## Env secrets (in Supabase Edge Function secrets)
```
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_WEBHOOK_URL   = https://<ref>.supabase.co/functions/v1/google-calendar-webhook
```

## Milestone
User can sign in with Google on desktop. "Til" calendar appears in their Google Calendar. `calendars` table has a row. `user_tokens` has encrypted tokens.
