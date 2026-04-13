import React, { useState } from 'react';
import { signInWithGoogle } from '../lib/supabase';

function LogoMark({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <path d="M24 2 L46 24 L24 46 L2 24 Z" fill="none" stroke="var(--amber)" strokeWidth="1.6"/>
      <path d="M24 2 L46 24 L24 24 Z" fill="var(--amber)" opacity="0.85"/>
    </svg>
  );
}

export function AuthScreen({ externalError }: { externalError?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--ink)',
        userSelect: 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Radial amber glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'radial-gradient(ellipse 55% 45% at 50% 42%, rgba(232,168,66,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Card */}
      <div
        className="animate-fadeUp"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 28,
          padding: '48px 52px',
          width: 400,
          background: 'var(--ink-3)',
          border: '1px solid var(--border-2)',
          borderRadius: 'var(--r-xl)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Logo + wordmark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <LogoMark size={48} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 36,
              fontStyle: 'italic',
              color: 'var(--text-1)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            til
          </span>
        </div>

        {/* Tagline */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 16,
              fontWeight: 500,
              color: 'var(--text-1)',
              letterSpacing: '-0.01em',
            }}
          >
            Your tasks. Your time.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              color: 'var(--text-2)',
              lineHeight: 1.6,
              maxWidth: 260,
            }}
          >
            Capture tasks with natural language, schedule them on your
            calendar, and stay focused on what matters.
          </p>
        </div>

        {/* Sign in button */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleSignIn}
            disabled={loading || waiting}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              padding: '11px 20px',
              background: loading || waiting ? 'rgba(232,168,66,0.4)' : 'var(--amber)',
              color: 'var(--ink)',
              border: 'none',
              borderRadius: 'var(--r-md)',
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 500,
              cursor: loading || waiting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, opacity 0.15s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => {
              if (!loading && !waiting) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--amber-hi)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && !waiting) {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--amber)';
              }
            }}
          >
            {loading ? (
              <>
                <Spinner color="var(--ink)" />
                <span>Opening browser…</span>
              </>
            ) : waiting ? (
              <>
                <Spinner color="var(--ink)" />
                <span>Waiting for sign-in…</span>
              </>
            ) : (
              <>
                {/* Google G */}
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          {error && (
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--rose)',
                textAlign: 'center',
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-4)',
            textAlign: 'center',
          }}
        >
          Your data is encrypted and private
        </p>
      </div>
    </div>
  );
}

function Spinner({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 14,
        height: 14,
        border: `1.5px solid ${color}`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}
