import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Receives push notifications from Google Calendar when events change.
// Performs incremental sync and upserts into calendar_events table.
// Supabase Realtime then broadcasts the change to all connected clients.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

function serviceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function refreshAccessToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  refreshToken: string,
): Promise<string> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Token refresh failed: ${resp.status} ${err}`);
  }

  const data = await resp.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  const { error } = await supabase
    .from('user_tokens')
    .update({
      google_access_token: data.access_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to persist refreshed token: ${error.message}`);

  return data.access_token as string;
}

async function getValidAccessToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data: tokenRow, error } = await supabase
    .from('user_tokens')
    .select('google_access_token, google_refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !tokenRow) throw new Error(`No token record for user ${userId}`);

  const expiresAt = new Date(tokenRow.expires_at).getTime();
  const nowWithBuffer = Date.now() + 60_000; // refresh 60s early

  if (expiresAt > nowWithBuffer) {
    return tokenRow.google_access_token as string;
  }

  if (!tokenRow.google_refresh_token) {
    throw new Error(`No refresh token available for user ${userId}`);
  }

  return refreshAccessToken(supabase, userId, tokenRow.google_refresh_token as string);
}

interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  updated?: string;
  [key: string]: unknown;
}

interface EventListResponse {
  items?: GoogleEvent[];
  nextSyncToken?: string;
  nextPageToken?: string;
}

async function fetchChangedEvents(
  accessToken: string,
  googleCalendarId: string,
  syncToken: string | null,
): Promise<{ events: GoogleEvent[]; nextSyncToken: string | null }> {
  const allEvents: GoogleEvent[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  do {
    const url = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events`,
    );
    url.searchParams.set('singleEvents', 'true');
    if (syncToken) url.searchParams.set('syncToken', syncToken);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (resp.status === 410) {
      // Sync token invalid — signal caller to do a full resync
      throw Object.assign(new Error('Sync token expired'), { code: 410 });
    }

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Google Calendar events list failed: ${resp.status} ${body}`);
    }

    const data: EventListResponse = await resp.json();
    if (data.items) allEvents.push(...data.items);
    nextSyncToken = data.nextSyncToken ?? null;
    pageToken = data.nextPageToken;
  } while (pageToken);

  return { events: allEvents, nextSyncToken };
}

async function syncEvents(
  supabase: ReturnType<typeof createClient>,
  calendarId: string,
  googleCalendarId: string,
  accessToken: string,
  syncToken: string | null,
): Promise<string | null> {
  let result: { events: GoogleEvent[]; nextSyncToken: string | null };

  try {
    result = await fetchChangedEvents(accessToken, googleCalendarId, syncToken);
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 410) {
      // Full resync — no sync token
      console.log('Sync token expired, performing full resync');
      result = await fetchChangedEvents(accessToken, googleCalendarId, null);
    } else {
      throw err;
    }
  }

  const { events, nextSyncToken } = result;

  for (const event of events) {
    if (event.status === 'cancelled') {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('calendar_id', calendarId)
        .eq('google_event_id', event.id);

      if (error) {
        console.error(`Failed to delete cancelled event ${event.id}:`, error.message);
      }
    } else {
      const startAt = event.start?.dateTime ?? event.start?.date ?? null;
      const endAt = event.end?.dateTime ?? event.end?.date ?? null;

      if (!startAt) {
        console.warn(`Skipping event ${event.id} with no start time`);
        continue;
      }

      // Look up existing row so we can update in-place (no composite unique constraint)
      const { data: existing } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('calendar_id', calendarId)
        .eq('google_event_id', event.id)
        .maybeSingle();

      const eventRow = {
        calendar_id: calendarId,
        google_event_id: event.id,
        title: event.summary ?? '(No title)',
        start_at: startAt,
        end_at: endAt,
        is_task_block: false,
        is_suggestion: false,
        raw_json: event,
        updated_at: new Date().toISOString(),
      };

      let upsertError: { message: string } | null = null;

      if (existing?.id) {
        const { error } = await supabase
          .from('calendar_events')
          .update(eventRow)
          .eq('id', existing.id);
        upsertError = error;
      } else {
        const { error } = await supabase.from('calendar_events').insert(eventRow);
        upsertError = error;
      }

      if (upsertError) {
        console.error(`Failed to upsert event ${event.id}:`, upsertError.message);
      }
    }
  }

  return nextSyncToken;
}

serve(async (req) => {
  const channelId = req.headers.get('X-Goog-Channel-Id');
  const resourceState = req.headers.get('X-Goog-Resource-State');

  // Initial handshake from Google — just acknowledge
  if (resourceState === 'sync') {
    return new Response('ok', { status: 200 });
  }

  if (!channelId) {
    return new Response('Missing channel ID', { status: 400 });
  }

  if (resourceState !== 'exists' && resourceState !== 'not_exists') {
    return new Response('Unhandled resource state', { status: 200 });
  }

  const supabase = serviceClient();

  // Look up calendar by webhook channel ID (stored in webhook_resource_id at setup)
  const { data: calendar, error: calendarError } = await supabase
    .from('calendars')
    .select('id, user_id, google_calendar_id, sync_token')
    .eq('webhook_resource_id', channelId)
    .single();

  if (calendarError || !calendar) {
    console.error(`No calendar found for channel ${channelId}:`, calendarError?.message);
    return new Response('Calendar not found', { status: 404 });
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(supabase, calendar.user_id as string);
  } catch (err) {
    console.error('Failed to get access token:', err);
    return new Response('Token error', { status: 500 });
  }

  let nextSyncToken: string | null;
  try {
    nextSyncToken = await syncEvents(
      supabase,
      calendar.id as string,
      calendar.google_calendar_id as string,
      accessToken,
      calendar.sync_token as string | null,
    );
  } catch (err) {
    console.error('Sync failed:', err);
    return new Response('Sync error', { status: 500 });
  }

  // Persist the new sync token for the next incremental sync
  if (nextSyncToken) {
    const { error: updateError } = await supabase
      .from('calendars')
      .update({ sync_token: nextSyncToken })
      .eq('id', calendar.id);

    if (updateError) {
      console.error('Failed to update sync token:', updateError.message);
    }
  }

  console.log(
    `Webhook processed for channel: ${channelId}, state: ${resourceState}, events synced`,
  );

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
