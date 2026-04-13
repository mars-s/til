import React, { useState } from 'react';
import { signInWithGoogle } from '../lib/supabase';

export function AuthScreen({ externalError }: { externalError?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show external errors (e.g. code exchange failures from useAuth) and reset waiting
  React.useEffect(() => {
    if (externalError) {
      setError(externalError);
      setWaiting(false);
    }
  }, [externalError]);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Browser is now open — stop the spinner, show waiting state
      setLoading(false);
      setWaiting(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e));
      setLoading(false);
      setWaiting(false);
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center h-screen select-none"
      style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(99,102,241,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Card */}
      <div
        className="relative flex flex-col items-center gap-8 px-12 py-14 rounded-2xl w-[400px]"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Logo mark */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(168,85,247,0.2) 100%)',
              border: '1px solid rgba(99,102,241,0.4)',
            }}
          >
            {/* Geometric mark: overlapping squares */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect
                x="2"
                y="2"
                width="15"
                height="15"
                rx="3"
                fill="none"
                stroke="rgba(165,180,252,0.9)"
                strokeWidth="1.5"
              />
              <rect
                x="11"
                y="11"
                width="15"
                height="15"
                rx="3"
                fill="rgba(99,102,241,0.5)"
                stroke="rgba(165,180,252,0.7)"
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/* Wordmark */}
          <div
            className="text-3xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em',
            }}
          >
            til
          </div>
        </div>

        {/* Tagline + description */}
        <div className="flex flex-col items-center gap-2 text-center">
          <p
            className="text-xl font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            Your tasks. Your time.
          </p>
          <p
            className="text-sm leading-relaxed max-w-[260px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            Capture tasks with natural language, schedule them on your calendar,
            and stay focused on what matters.
          </p>
        </div>

        {/* Sign in button */}
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full py-3 px-5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{
              background: loading
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(255,255,255,0.08)',
              color: loading ? 'var(--text-secondary)' : 'var(--text-primary)',
              border: '1px solid rgba(255,255,255,0.12)',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 1px 2px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  'rgba(255,255,255,0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(255,255,255,0.08)';
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  'rgba(255,255,255,0.12)';
              }
            }}
          >
            {loading ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--text-secondary)', borderTopColor: 'transparent' }}
                />
                <span>Opening browser…</span>
              </>
            ) : waiting ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                />
                <span style={{ color: 'var(--accent)' }}>Waiting for sign-in…</span>
              </>
            ) : (
              <>
                {/* Google "G" logo */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
                    fill="#34A853"
                  />
                  <path
                    d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          {error && (
            <p
              className="text-xs text-center"
              style={{ color: 'rgba(248,113,113,0.9)' }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <p
          className="text-xs text-center"
          style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
        >
          Your data is encrypted and private
        </p>
      </div>
    </div>
  );
}
