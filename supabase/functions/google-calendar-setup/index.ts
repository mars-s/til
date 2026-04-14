import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Runs once after a user's first Google OAuth login.
// 1. Stores Google tokens from provider_token (if not already in user_tokens)
// 2. Creates a "Til" calendar in the user's Google Calendar (if not already done)
// 3. Full sync: pulls primary calendar events into calendar_events
// 4. Registers a Google push channel (webhook) for the Til calendar
//
// POST body:
//   { provider_token?: string, provider_refresh_token?: string, expires_at?: string }
//
// The caller should pass provider_token from the Supabase session on first login.
// On subsequent calls those fields are ignored if a token already exists in user_tokens.

interface SetupRequestBody {
  provider_token?: string;
  provider_refresh_token?: string;
  expires_at?: string; // ISO8601
}

/** Fetch all calendars from Google Calendar API */
async function fetchAllCalendars(
  accessToken: string,
): Promise<GoogleCalendarListItem[]> {
  const calendars: GoogleCalendarListItem[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({ maxResults: '250' });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/users/me/calendarList?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Failed to list calendars: ${res.status} ${JSON.stringify(err)}`);
    }

    const body = await res.json();
    if (body.items) calendars.push(...body.items);
    pageToken = body.nextPageToken;
  } while (pageToken);

  return calendars;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
}

interface GoogleEventsListResponse {
  items?: GoogleCalendarEvent[];
  nextSyncToken?: string;
  nextPageToken?: string;
}

interface GoogleCalendarListItem {
  id: string;
  summary: string;
  backgroundColor?: string;
  foregroundColor?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Ensure we have a valid (non-expired) access token. Refreshes if needed. */
async function ensureFreshToken(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string> {
  const { data: tokenRow, error } = await supabase
    .from('user_tokens')
    .select('google_access_token, google_refresh_token, expires_at')
    .eq('user_id', userId)
    .single();

  if (error || !tokenRow) {
    throw new Error('No token row found for user');
  }

  const bufferMs = 60 * 1000; // 1-minute buffer
  const isExpired =
    !tokenRow.expires_at ||
    new Date(tokenRow.expires_at).getTime() - bufferMs < Date.now();

  if (!isExpired && tokenRow.google_access_token) {
    return tokenRow.google_access_token as string;
  }

  if (!tokenRow.google_refresh_token) {
    throw new Error('No refresh token available — user must re-authenticate');
  }

  // Refresh via Google
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: tokenRow.google_refresh_token as string,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Token refresh failed: ${data.error} — ${data.error_description}`);
  }

  const newExpiresAt = new Date(Date.now() + (data.expires_in - 60) * 1000).toISOString();

  await supabase
    .from('user_tokens')
    .update({
      google_access_token: data.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return data.access_token as string;
}

/** Fetch all pages of events from a Google Calendar events list call. */
async function fetchAllEvents(
  calendarId: string,
  accessToken: string,
): Promise<{ events: GoogleCalendarEvent[]; syncToken: string | null }> {
  const events: GoogleCalendarEvent[] = [];
  let pageToken: string | undefined;
  let syncToken: string | null = null;

  do {
    const params = new URLSearchParams({
      maxResults: '250',
      singleEvents: 'true',
      orderBy: 'startTime',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Failed to list events: ${res.status} ${JSON.stringify(err)}`);
    }

    const body: GoogleEventsListResponse = await res.json();
    if (body.items) events.push(...body.items);
    syncToken = body.nextSyncToken ?? null;
    pageToken = body.nextPageToken;
  } while (pageToken);

  return { events, syncToken };
}

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // ------------------------------------------------------------------
  // Auth: verify Supabase JWT and extract user
  // ------------------------------------------------------------------
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Service-role client (bypasses RLS on user_tokens)
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // User-scoped client (to validate the JWT)
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // ------------------------------------------------------------------
  // Parse optional body for provider tokens
  // ------------------------------------------------------------------
  let body: SetupRequestBody = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is fine
  }

  // ------------------------------------------------------------------
  // 1. Store tokens in user_tokens if not already there
  // ------------------------------------------------------------------
  const { data: existingToken } = await serviceClient
    .from('user_tokens')
    .select('google_access_token, google_refresh_token')
    .eq('user_id', user.id)
    .maybeSingle();

  const hasStoredToken = !!existingToken?.google_access_token;

  if (!hasStoredToken) {
    // Need tokens from the request body (provider_token from Supabase session)
    if (!body.provider_token) {
      return new Response(
        JSON.stringify({
          error:
            'No Google token found. Pass provider_token from your Supabase session in the request body.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    const expiresAt =
      body.expires_at ?? new Date(Date.now() + 3540 * 1000).toISOString(); // default ~59 min

    const { error: upsertErr } = await serviceClient.from('user_tokens').upsert(
      {
        user_id: user.id,
        google_access_token: body.provider_token,
        google_refresh_token: body.provider_refresh_token ?? null,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (upsertErr) {
      console.error('Failed to store user tokens:', upsertErr.message);
      return new Response(
        JSON.stringify({ error: `Failed to store tokens: ${upsertErr.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    console.log(`Stored Google tokens for user ${user.id}`);
  }

  // ------------------------------------------------------------------
  // 2. Get a fresh access token (refresh if needed)
  // ------------------------------------------------------------------
  let accessToken: string;
  try {
    accessToken = await ensureFreshToken(serviceClient, user.id);
  } catch (err) {
    console.error('Token fetch/refresh error:', err);
    return new Response(
      JSON.stringify({ error: `Could not obtain valid Google token: ${(err as Error).message}` }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
    );
  }

  // ------------------------------------------------------------------
  // 3. Check if a "Til" calendar row already exists for this user
  // ------------------------------------------------------------------
  const { data: existingCalendar } = await serviceClient
    .from('calendars')
    .select('id, google_calendar_id, webhook_resource_id, webhook_expiration')
    .eq('user_id', user.id)
    .eq('name', 'Til')
    .maybeSingle();

  let calendarRowId: string;
  let googleCalendarId: string;

  if (existingCalendar) {
    // Calendar already set up — skip creation
    calendarRowId = existingCalendar.id as string;
    googleCalendarId = existingCalendar.google_calendar_id as string;
    console.log(`Til calendar already exists for user ${user.id}: ${googleCalendarId}`);
  } else {
    // ------------------------------------------------------------------
    // 4. Create the "Til" calendar via Google Calendar API
    // ------------------------------------------------------------------
    const createCalRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: 'Til',
          description: 'Tasks from Til app',
          timeZone: 'UTC',
        }),
      },
    );

    if (!createCalRes.ok) {
      const errBody = await createCalRes.json().catch(() => ({}));
      console.error('Failed to create Til calendar:', errBody);
      return new Response(
        JSON.stringify({ error: `Failed to create Google calendar: ${JSON.stringify(errBody)}` }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    const newCal: GoogleCalendarListItem = await createCalRes.json();
    googleCalendarId = newCal.id;
    console.log(`Created Til calendar: ${googleCalendarId}`);

    // ------------------------------------------------------------------
    // 5. Insert row into calendars table
    // ------------------------------------------------------------------
    const { data: insertedCalendar, error: insertCalErr } = await serviceClient
      .from('calendars')
      .insert({
        user_id: user.id,
        name: 'Til',
        google_calendar_id: googleCalendarId,
        color: '#4285F4',
        is_primary: true,
      })
      .select('id')
      .single();

    if (insertCalErr || !insertedCalendar) {
      console.error('Failed to insert calendar row:', insertCalErr?.message);
      return new Response(
        JSON.stringify({ error: `Failed to save calendar: ${insertCalErr?.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    calendarRowId = insertedCalendar.id as string;
  }

  // ------------------------------------------------------------------
  // 6. Full sync: fetch all events from the user's primary calendar
  //    and upsert into calendar_events
  // ------------------------------------------------------------------
  let syncToken: string | null = null;
  try {
    const { events, syncToken: newSyncToken } = await fetchAllEvents('primary', accessToken);
    syncToken = newSyncToken;

    if (events.length > 0) {
      // Filter out cancelled events and those without a start time
      const rows = events
        .filter((e) => e.status !== 'cancelled' && (e.start?.dateTime || e.start?.date))
        .map((e) => ({
          calendar_id: calendarRowId,
          google_event_id: e.id,
          title: e.summary ?? '(no title)',
          start_at: e.start!.dateTime ?? e.start!.date!,
          end_at: e.end?.dateTime ?? e.end?.date ?? null,
          is_task_block: false,
          is_suggestion: false,
          raw_json: e,
          updated_at: new Date().toISOString(),
        }));

      if (rows.length > 0) {
        const { error: upsertEventsErr } = await serviceClient
          .from('calendar_events')
          .upsert(rows, { onConflict: 'calendar_id,google_event_id', ignoreDuplicates: false });

        if (upsertEventsErr) {
          // Non-fatal: log and continue
          console.error('Failed to upsert calendar events:', upsertEventsErr.message);
        } else {
          console.log(`Upserted ${rows.length} events for user ${user.id}`);
        }
      }
    }
  } catch (err) {
    // Non-fatal: log, don't abort — webhook registration is more important
    console.error('Full sync failed:', err);
  }

  // Store sync token on the calendar row
  if (syncToken) {
    await serviceClient
      .from('calendars')
      .update({ sync_token: syncToken })
      .eq('id', calendarRowId);
  }

  // ------------------------------------------------------------------
  // 6b. Fetch all Google calendars and sync their events
  // ------------------------------------------------------------------
  try {
    const googleCals = await fetchAllCalendars(accessToken);
    console.log(`Found ${googleCals.length} calendars for user`);

    for (const gCal of googleCals) {
      // Check if this calendar already exists in our DB
      const { data: existingCal } = await serviceClient
        .from('calendars')
        .select('id')
        .eq('user_id', user.id)
        .eq('google_calendar_id', gCal.id)
        .maybeSingle();

      let calRowId: string;

      if (existingCal) {
        calRowId = existingCal.id;
        // Update color if changed
        await serviceClient
          .from('calendars')
          .update({ color: gCal.backgroundColor || '#4285F4' })
          .eq('id', calRowId);
      } else {
        // Insert new calendar
        const { data: insertedCal, error: insertCalErr } = await serviceClient
          .from('calendars')
          .insert({
            user_id: user.id,
            name: gCal.summary,
            google_calendar_id: gCal.id,
            color: gCal.backgroundColor || '#4285F4',
            is_primary: gCal.id === 'primary',
          })
          .select('id')
          .single();

        if (insertCalErr || !insertedCal) {
          console.error(`Failed to insert calendar ${gCal.summary}:`, insertCalErr?.message);
          continue;
        }
        calRowId = insertedCal.id;
      }

      // Fetch events from this calendar
      const { events } = await fetchAllEvents(gCal.id, accessToken);

      if (events.length > 0) {
        const rows = events
          .filter((e) => e.status !== 'cancelled' && (e.start?.dateTime || e.start?.date))
          .map((e) => ({
            calendar_id: calRowId,
            google_event_id: e.id,
            title: e.summary ?? '(no title)',
            start_at: e.start!.dateTime ?? e.start!.date!,
            end_at: e.end?.dateTime ?? e.end?.date ?? null,
            is_task_block: false,
            is_suggestion: false,
            raw_json: e,
            updated_at: new Date().toISOString(),
          }));

        if (rows.length > 0) {
          const { error: upsertErr } = await serviceClient
            .from('calendar_events')
            .upsert(rows, { onConflict: 'calendar_id,google_event_id', ignoreDuplicates: false });

          if (upsertErr) {
            console.error(`Failed to upsert events for ${gCal.summary}:`, upsertErr.message);
          } else {
            console.log(`Synced ${rows.length} events from ${gCal.summary}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to sync all calendars:', err);
  }

  // ------------------------------------------------------------------
  // 7. Register (or renew) push webhook with Google
  // ------------------------------------------------------------------
  const webhookUrl = Deno.env.get('GOOGLE_WEBHOOK_URL')!;

  // Check if existing webhook is still valid (>= 1 hour remaining)
  const webhookExpiration = existingCalendar?.webhook_expiration as string | null | undefined;
  const webhookStillValid =
    webhookExpiration &&
    new Date(webhookExpiration).getTime() - Date.now() > 60 * 60 * 1000;

  if (!webhookStillValid) {
    const channelId = crypto.randomUUID();

    const watchRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(googleCalendarId)}/events/watch`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
        }),
      },
    );

    if (!watchRes.ok) {
      const errBody = await watchRes.json().catch(() => ({}));
      console.error('Failed to register webhook:', errBody);
      // Non-fatal: return partial success — sync still worked
      return new Response(
        JSON.stringify({
          ok: true,
          calendar_id: calendarRowId,
          google_calendar_id: googleCalendarId,
          warning: `Webhook registration failed: ${JSON.stringify(errBody)}`,
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    const watchData = await watchRes.json();
    const resourceId: string = watchData.resourceId;
    // Google returns expiration as a Unix ms timestamp string
    const expirationMs: number = parseInt(watchData.expiration, 10);
    const expirationIso = new Date(expirationMs).toISOString();

    const { error: updateWebhookErr } = await serviceClient
      .from('calendars')
      .update({
        webhook_resource_id: resourceId,
        webhook_expiration: expirationIso,
      })
      .eq('id', calendarRowId);

    if (updateWebhookErr) {
      console.error('Failed to store webhook metadata:', updateWebhookErr.message);
    } else {
      console.log(
        `Webhook registered for calendar ${googleCalendarId}, expires ${expirationIso}`,
      );
    }
  } else {
    console.log(`Webhook still valid for calendar ${googleCalendarId}, skipping registration`);
  }

  // ------------------------------------------------------------------
  // 8. Done
  // ------------------------------------------------------------------
  return new Response(
    JSON.stringify({
      ok: true,
      calendar_id: calendarRowId,
      google_calendar_id: googleCalendarId,
    }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } },
  );
});
