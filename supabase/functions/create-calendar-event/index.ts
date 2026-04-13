import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Creates a Google Calendar event when a task is given a scheduled_at time.
// Stores the resulting google_event_id back on the task row.

interface CreateEventRequest {
  task_id: string;
  title: string;
  start_at: string; // ISO8601
  end_at?: string;
  duration_minutes?: number;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

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

function addMinutes(isoDate: string, minutes: number): string {
  return new Date(new Date(isoDate).getTime() + minutes * 60_000).toISOString();
}

serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401 });

  let body: CreateEventRequest;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { task_id, title, start_at, end_at: requestedEndAt, duration_minutes } = body;

  if (!task_id || !title || !start_at) {
    return new Response('Missing required fields: task_id, title, start_at', { status: 400 });
  }

  // Service-role client used for all DB operations, but auth header passed so
  // supabase.auth.getUser() can validate the JWT.
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // 1. Get the user's primary "Til" calendar
  const { data: calendar, error: calendarError } = await supabase
    .from('calendars')
    .select('id, google_calendar_id')
    .eq('user_id', user.id)
    .eq('is_primary', true)
    .single();

  if (calendarError || !calendar || !calendar.google_calendar_id) {
    return new Response(
      JSON.stringify({ error: 'Run google-calendar-setup first' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 2. Get a valid Google access token (refresh if expired)
  let accessToken: string;
  try {
    accessToken = await getValidAccessToken(supabase, user.id);
  } catch (err) {
    console.error('Token error:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to obtain Google access token' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // 3. Calculate end_at — use provided value, or derive from duration, or default to 30 min
  const endAt = requestedEndAt ?? addMinutes(start_at, duration_minutes ?? 30);

  // 4. Create the Google Calendar event
  const googleCalendarId = calendar.google_calendar_id as string;
  const calendarId = calendar.id as string;

  const eventPayload = {
    summary: title,
    description: 'Created by Til',
    start: { dateTime: start_at, timeZone: 'UTC' },
    end: { dateTime: endAt, timeZone: 'UTC' },
  };

  const googleResp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    },
  );

  if (!googleResp.ok) {
    const errBody = await googleResp.text();
    console.error(`Google Calendar API error: ${googleResp.status} ${errBody}`);
    return new Response(
      JSON.stringify({ error: 'Google Calendar API error', detail: errBody }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const googleEvent = await googleResp.json();
  const googleEventId: string = googleEvent.id;

  // 5. Insert the event into calendar_events
  const { data: insertedEvent, error: insertError } = await supabase
    .from('calendar_events')
    .insert({
      calendar_id: calendarId,
      google_event_id: googleEventId,
      title,
      start_at,
      end_at: endAt,
      is_task_block: true,
      is_suggestion: false,
      raw_json: googleEvent,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !insertedEvent) {
    console.error('Failed to insert calendar_event:', insertError?.message);
    return new Response(
      JSON.stringify({ error: 'Failed to save calendar event' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const calendarEventId: string = insertedEvent.id;

  // 6. Link the Google event back to the task (scoped to the authenticated user)
  const { error: taskUpdateError } = await supabase
    .from('tasks')
    .update({ calendar_event_id: googleEventId })
    .eq('id', task_id)
    .eq('user_id', user.id);

  if (taskUpdateError) {
    console.error('Failed to update task.calendar_event_id:', taskUpdateError.message);
    // Non-fatal: the calendar event was created successfully; log and continue.
  }

  return new Response(
    JSON.stringify({ ok: true, google_event_id: googleEventId, calendar_event_id: calendarEventId }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
