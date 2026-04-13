import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';

let _supabase: SupabaseClient | null = null;

export async function getSupabase(): Promise<SupabaseClient> {
  if (_supabase) return _supabase;

  // Try Vite env vars first, then ask Rust backend
  let url = import.meta.env.VITE_SUPABASE_URL as string;
  let key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  if (!url || !key) {
    const config = await invoke<[string, string]>('get_supabase_config');
    url = config[0];
    key = config[1];
  }

  _supabase = createClient(url, key, {
    auth: {
      flowType: 'pkce',        // Forces ?code= in query string (not #fragment) so our TCP server can read it
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return _supabase;
}

export async function signInWithGoogle(): Promise<void> {
  const supabase = await getSupabase();

  // Start a one-shot local server to receive the OAuth code callback
  const port = await invoke<number>('start_oauth_server');
  const redirectTo = `http://localhost:${port}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: 'email profile https://www.googleapis.com/auth/calendar',
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (data.url) {
    await open(data.url);
  }
}

export async function setSessionFromTokens(
  accessToken: string,
  refreshToken: string,
): Promise<Session> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
  if (!data.session) throw new Error('No session returned');

  // Persist to keychain
  await invoke('save_session', { accessToken, refreshToken });

  return data.session;
}

export async function loadStoredSession(): Promise<Session | null> {
  try {
    const stored = await invoke<[string, string] | null>('get_stored_session');
    if (!stored) return null;
    const [accessToken, refreshToken] = stored;
    return await setSessionFromTokens(accessToken, refreshToken);
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  await invoke('clear_session');
}
