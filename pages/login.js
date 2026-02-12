// pages/login.js - Premium Design System from Mockup
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../utils/supabaseClient';
import Head from 'next/head';
import { authUnavailableReason, isAuthUnreachable } from '../lib/authReachability';

const LOGIN_TIMEOUT_MS = 8000;
const AUTH_UNAVAILABLE_MESSAGE = 'Auth service unreachable. Check Supabase Auth Site URL / Redirect URLs for rapid-routes.vercel.app or Supabase outage.';

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    }),
  ]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export default function LoginPage() {
  const router = useRouter();
  const {
    isAuthenticated,
    loading,
    authUnavailable,
    authUnavailableReason: authUnavailableReasonState,
    markAuthUnavailable,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const authProbeStartedRef = useRef(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (loading || isAuthenticated || authUnavailable || authProbeStartedRef.current) {
      return;
    }

    authProbeStartedRef.current = true;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      return;
    }

    let active = true;
    const probeAuth = async () => {
      try {
        await withTimeout(
          fetch(`${supabaseUrl}/auth/v1/settings`, { method: 'GET' }),
          LOGIN_TIMEOUT_MS,
          'SESSION_TIMEOUT'
        );
      } catch (probeError) {
        if (!active) return;
        if (!isAuthUnreachable(probeError) && probeError?.message !== 'SESSION_TIMEOUT') {
          return;
        }
        const reason = authUnavailableReason(probeError);
        markAuthUnavailable(reason);
        setError(`${AUTH_UNAVAILABLE_MESSAGE} (${reason})`);
      }
    };

    probeAuth();
    return () => {
      active = false;
    };
  }, [loading, isAuthenticated, authUnavailable, markAuthUnavailable]);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (authUnavailable) {
        setError(`${AUTH_UNAVAILABLE_MESSAGE}${authUnavailableReasonState ? ` (${authUnavailableReasonState})` : ''}`);
        return;
      }

      if (!supabase) {
        setError('Authentication service is not configured. Please contact support.');
        return;
      }

      const { error: authError } = await withTimeout(supabase.auth.signInWithPassword({
        email,
        password,
      }), LOGIN_TIMEOUT_MS, 'SESSION_TIMEOUT');

      if (authError) {
        if (isAuthUnreachable(authError)) {
          const reason = authUnavailableReason(authError);
          markAuthUnavailable(reason);
          setError(`${AUTH_UNAVAILABLE_MESSAGE} (${reason})`);
          return;
        }
        setError(authError.message);
        return;
      }

      router.push('/dashboard');
    } catch (err) {
      if (isAuthUnreachable(err) || err?.message === 'SESSION_TIMEOUT') {
        const reason = authUnavailableReason(err);
        markAuthUnavailable(reason);
        setError(`${AUTH_UNAVAILABLE_MESSAGE} (${reason})`);
        return;
      }
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="login-container">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Sign In | RapidRoutes</title>
      </Head>

      <div className="login-container">
        {/* Hero Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: '48px',
        }}>
          <h1 className="logo-text" style={{
            fontSize: '48px',
            marginBottom: '12px'
          }}>
            RapidRoutes
          </h1>
          <p style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>
            Freight Brokerage Automation
          </p>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <div className="login-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue</p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {authUnavailable && !error && (
            <div className="error-message">
              {`${AUTH_UNAVAILABLE_MESSAGE}${authUnavailableReasonState ? ` (${authUnavailableReasonState})` : ''}`}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={busy}
              style={{
                width: '100%',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {busy ? (
                <>
                  <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
