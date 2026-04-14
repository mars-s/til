import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Session, createClient } from '@supabase/supabase-js';
import {
  getSupabase,
  loadStoredSession,
  signOut as sbSignOut,
} from '../lib/supabase';
import { invoke } from '@tauri-apps/api/core';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Restore persisted session on mount
    loadStoredSession().then((s) => {
      setSession(s);
      setLoading(false);
    });

    console.log('[auth] setting up oauth-code listener');

    const unlistenCode = listen<string>('oauth-code', async (event) => {
      const code = event.payload;
      console.log('[oauth] received code event, code length:', code?.length);
      if (!code) return;
      setAuthError(null);
      try {
        const supabase = await getSupabase();
        console.log('[oauth] calling exchangeCodeForSession...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('[oauth] exchange error:', error.message, error);
          throw error;
        }
        console.log('[oauth] success! user:', data.session?.user?.email);
          if (data.session) {
            await invoke('save_session', {
              accessToken: data.session.access_token,
              refreshToken: data.session.refresh_token,
            });
            setSession(data.session);
            
            if (data.session.provider_token) {
              console.log('[oauth] setting up google calendar with edge function...');
              // Small delay to ensure session is fully established
              await new Promise(r => setTimeout(r, 100));
              
              // Create a client with the session to ensure auth header is included
              const supabaseWithAuth = createClient(
                import.meta.env.VITE_SUPABASE_URL as string,
                import.meta.env.VITE_SUPABASE_ANON_KEY as string,
                {
                  global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
                  auth: { persistSession: false }
                }
              );
              
              const { data: setupData, error: setupError } = await supabaseWithAuth.functions.invoke('google-calendar-setup', {
                body: {
                  provider_token: data.session.provider_token,
                  provider_refresh_token: data.session.provider_refresh_token,
                }
              });
              console.log('[oauth] setup response:', setupData, setupError);
              if (setupError) {
                console.error('[oauth] edge function error:', setupError);
              } else {
                console.log('[oauth] edge function setup complete.');
              }
            }
          }
      } catch (e) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        console.error('[oauth] exchange failed:', msg);
        setAuthError(msg);
      }
    });

    const unlistenError = listen<string>('oauth-error', (event) => {
      console.error('[oauth] server error:', event.payload);
      setAuthError(event.payload);
    });

    return () => {
      unlistenCode.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, []);

  const signOut = useCallback(async () => {
    await sbSignOut();
    setSession(null);
  }, []);

  return { session, loading, authError, signOut };
}
