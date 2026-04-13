import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Refreshes Google OAuth access tokens before they expire.
// Call this on a schedule (e.g. every 50 minutes) or on-demand before API calls.
//
// POST body (optional):
//   { user_id: string }  — refresh a single user
//   (no body)            — refresh all tokens expiring within 10 minutes (cron mode)

interface UserTokenRow {
  user_id: string;
  google_refresh_token: string | null;
  expires_at: string | null;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  error?: string;
  error_description?: string;
}

serve(async (req) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Parse optional body — cron invocations may send an empty body
  let userId: string | undefined;
  try {
    const body = await req.json();
    userId = body?.user_id;
  } catch {
    // Empty / non-JSON body is fine for cron mode
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

  // ------------------------------------------------------------------
  // 1. Fetch token rows to refresh
  // ------------------------------------------------------------------
  let query = supabase
    .from('user_tokens')
    .select('user_id, google_refresh_token, expires_at');

  if (userId) {
    // Single-user mode
    query = query.eq('user_id', userId);
  } else {
    // Cron mode: all tokens expiring in the next 10 minutes (or already expired)
    const threshold = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    query = query.or(`expires_at.is.null,expires_at.lte.${threshold}`);
  }

  const { data: tokens, error: fetchError } = await query.returns<UserTokenRow[]>();

  if (fetchError) {
    console.error('Failed to fetch user_tokens:', fetchError.message);
    return new Response(
      JSON.stringify({ ok: false, error: fetchError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (!tokens || tokens.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, refreshed: 0 }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ------------------------------------------------------------------
  // 2. Refresh each token
  // ------------------------------------------------------------------
  let refreshed = 0;

  await Promise.all(
    tokens.map(async (row) => {
      if (!row.google_refresh_token) {
        console.warn(`user ${row.user_id}: no refresh token stored, skipping`);
        return;
      }

      try {
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: row.google_refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        const tokenData: GoogleTokenResponse = await tokenRes.json();

        if (!tokenRes.ok || tokenData.error) {
          console.error(
            `user ${row.user_id}: Google token refresh failed —`,
            tokenData.error,
            tokenData.error_description,
          );
          return; // Don't throw; token may be revoked
        }

        // Compute new expiry (subtract 60s buffer)
        const expiresAt = new Date(
          Date.now() + (tokenData.expires_in - 60) * 1000,
        ).toISOString();

        const { error: updateError } = await supabase
          .from('user_tokens')
          .update({
            google_access_token: tokenData.access_token,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', row.user_id);

        if (updateError) {
          console.error(
            `user ${row.user_id}: failed to update user_tokens —`,
            updateError.message,
          );
          return;
        }

        refreshed++;
        console.log(`user ${row.user_id}: token refreshed, expires ${expiresAt}`);
      } catch (err) {
        console.error(`user ${row.user_id}: unexpected error during refresh —`, err);
      }
    }),
  );

  return new Response(
    JSON.stringify({ ok: true, refreshed }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
