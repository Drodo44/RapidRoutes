// pages/_app.js
import '../styles/design-tokens.css';
import '../styles/globals.css';
import '../styles/dashboard.css';
import '../styles/lanes.css';
import '../styles/sales-resources.css';
import '../styles/enterprise.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import NavBar from '../components/NavBar.jsx';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import Head from 'next/head';
import ErrorBoundary from '../components/ErrorBoundary';
import supabase from '../utils/supabaseClient';
import { Toaster } from 'react-hot-toast';

const PUBLIC_ROUTES = new Set(['/login', '/signup', '/']);

function AppContent({ Component, pageProps }) {
  const router = useRouter();
  const [routeLoading, setRouteLoading] = useState(false);
  const [bootError, setBootError] = useState(null);
  const { loading, isAuthenticated, session, authUnavailable, authUnavailableReason } = useAuth();
  const redirectGuardRef = useRef({ path: null, atMs: 0, count: 0 });
  const bootStartRef = useRef(Date.now());

  const logBoot = useCallback((step, extra = {}) => {
    console.log('[boot]', {
      step,
      elapsedMs: Date.now() - bootStartRef.current,
      pathname: router.pathname,
      hasSession: !!session,
      ...extra,
    });
  }, [router.pathname, session]);

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Verify Supabase initialization on mount
  useEffect(() => {
    bootStartRef.current = Date.now();
    const pathname = typeof window !== 'undefined' ? window.location.pathname : 'unknown';
    console.log('[boot]', {
      step: 'boot:start',
      elapsedMs: 0,
      pathname,
    });
    console.log("✅ Supabase initialized:", !!supabase);
    console.log("✅ Supabase URL configured:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('[boot]', {
      step: 'boot:supabaseClientReady',
      elapsedMs: Date.now() - bootStartRef.current,
      pathname,
      ready: !!supabase,
    });
  }, []);

  // Global auth redirect for protected routes
  useEffect(() => {
    if (authUnavailable) {
      setRouteLoading(false);
      setBootError(null);
      logBoot('boot:routeDecision', {
        decision: 'auth-unavailable-stop-redirects',
        reason: authUnavailableReason,
      });
      return;
    }

    if (!loading && !PUBLIC_ROUTES.has(router.pathname)) {
      if (!isAuthenticated) {
        const nowMs = Date.now();
        const guard = redirectGuardRef.current;

        if (guard.path === '/login' && (nowMs - guard.atMs) < 1000) {
          guard.count += 1;
        } else {
          guard.path = '/login';
          guard.count = 1;
        }
        guard.atMs = nowMs;

        logBoot('boot:routeDecision', {
          decision: 'redirect:/login',
          redirectCount: guard.count,
          isAuthenticated,
        });

        if (guard.count > 1) {
          const loopMessage = 'Redirect loop detected. Please reload.';
          console.error('[boot]', {
            step: 'boot:routeDecision',
            elapsedMs: Date.now() - bootStartRef.current,
            pathname: router.pathname,
            decision: 'redirect-loop-blocked',
          });
          setBootError(loopMessage);
          setRouteLoading(false);
          return;
        }

        router.replace('/login').catch((error) => {
          console.error('[boot] route redirect failed', error);
          setBootError('Failed to redirect to login. Please reload.');
        });
      } else {
        logBoot('boot:routeDecision', {
          decision: 'allow-protected-route',
          isAuthenticated,
        });
      }
    } else if (!loading) {
      logBoot('boot:routeDecision', {
        decision: 'allow-public-route',
        isAuthenticated,
      });
    }
  }, [loading, isAuthenticated, router, router.pathname, logBoot, authUnavailable, authUnavailableReason]);

  useEffect(() => {
    if (!loading || authUnavailable) {
      logBoot('boot:done', {
        loading: false,
        routeLoading,
        bootError: !!bootError,
        authUnavailable,
      });
    }
  }, [loading, routeLoading, bootError, router.pathname, logBoot, authUnavailable]);

  // Handle route changes
  useEffect(() => {
    const handleStart = () => setRouteLoading(true);
    const handleComplete = () => setRouteLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  // Check if current route is login/signup - don't show navbar
  const isAuthPage = router.pathname === '/login' || router.pathname === '/signup';

  return (
    <>
      <Head>
        <title>RapidRoutes | Freight Brokerage Automation</title>
        <meta name="description" content="Premium freight brokerage automation platform" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </Head>

      {/* Animated gradient background from mockup */}
      <div className="background"></div>

      <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
        {/* Loading bar */}
        {(loading || routeLoading) && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'var(--primary)',
            zIndex: 9999
          }}>
            <div style={{
              height: '100%',
              width: '30%',
              background: 'linear-gradient(90deg, transparent, var(--primary), transparent)',
              animation: 'loading 1s ease-in-out infinite'
            }}></div>
          </div>
        )}

        {authUnavailable ? (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ textAlign: 'center', maxWidth: '520px', padding: '0 16px' }}>
              <div style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 600 }}>
                Auth service unreachable
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Check Supabase Auth Site URL / Redirect URLs for rapid-routes.vercel.app or Supabase outage.
              </div>
              {authUnavailableReason && (
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                  Reason: {authUnavailableReason}
                </div>
              )}
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 14px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                Reload
              </button>
            </div>
          </div>
        ) : loading ? (
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {bootError ? (
              <div style={{ textAlign: 'center', maxWidth: '420px', padding: '0 16px' }}>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '12px' }}>{bootError}</div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Reload
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Loading RapidRoutes...</div>
              </div>
            )}
          </div>
        ) : (
          <ErrorBoundary componentName={Component.displayName || Component.name || 'Page'}>
            <Component {...pageProps} />
          </ErrorBoundary>
        )}
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.95) 0%, rgba(20, 20, 20, 0.9) 100%)',
            backdropFilter: 'blur(20px)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFFFFF',
            },
          },
        }}
      />
    </>
  );
}

export default function App({ Component, pageProps }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        {mounted ? (
          <AppContent Component={Component} pageProps={pageProps} />
        ) : null}
      </AuthProvider>
    </ErrorBoundary>
  );
}
