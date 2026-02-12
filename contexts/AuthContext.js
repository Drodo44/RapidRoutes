// contexts/AuthContext.js
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';
import { setBrowserSupabaseAuthAutoRefresh } from '../lib/supabaseClient';
import { authUnavailableReason, isAuthUnreachable } from '../lib/authReachability';

const AuthContext = createContext({});
const BOOT_TIMEOUT_MS = 8000;
const AUTH_BOOT_PUBLIC_ROUTES = new Set(['/login', '/signup']);

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

export function AuthProvider({ children }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authUnavailable, setAuthUnavailable] = useState(false);
  const [authUnavailableReasonState, setAuthUnavailableReasonState] = useState('');

  const bootStartRef = useRef(Date.now());
  const pathnameRef = useRef(router.pathname);
  const bootStartedRef = useRef(false);
  const mountedRef = useRef(false);
  const authUnavailableRef = useRef(false);
  const authUnavailableLoggedRef = useRef(false);
  const subscriptionRef = useRef(null);
  const bootLoggerRef = useRef(() => {});

  const markAuthUnavailable = useCallback((reasonInput) => {
    const reason = reasonInput || 'AUTH_UNREACHABLE';

    if (!authUnavailableRef.current) {
      authUnavailableRef.current = true;
      setAuthUnavailable(true);
      setAuthUnavailableReasonState(reason);
    }

    if (!authUnavailableLoggedRef.current) {
      console.log('[auth] authUnavailable', {
        reason,
        pathname: pathnameRef.current,
        supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      });
      authUnavailableLoggedRef.current = true;
    }

    try {
      setBrowserSupabaseAuthAutoRefresh(false);
    } catch (error) {
      console.error('[auth] failed to stop auto refresh', error);
    }

    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.unsubscribe();
      } catch (error) {
        console.error('[auth] failed to unsubscribe auth listener', error);
      }
      subscriptionRef.current = null;
    }

    if (mountedRef.current) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
    }

    bootLoggerRef.current('boot:routeDecision', { decision: 'auth-unavailable', reason });
    bootLoggerRef.current('boot:done', { loading: false, authUnavailable: true });
  }, []);

  useEffect(() => {
    pathnameRef.current = router.pathname;
  }, [router.pathname]);

  useEffect(() => {
    if (bootStartedRef.current) return;
    bootStartedRef.current = true;
    mountedRef.current = true;
    bootStartRef.current = Date.now();

    const logBoot = (step, extra = {}) => {
      console.log('[boot]', {
        step,
        elapsedMs: Date.now() - bootStartRef.current,
        pathname: pathnameRef.current,
        ...extra,
      });
    };
    bootLoggerRef.current = logBoot;

    const fetchProfileWithTimeout = async (accessToken, userId) => {
      if (authUnavailableRef.current) {
        throw new Error('AUTH_UNAVAILABLE');
      }

      logBoot('boot:getProfile:start', { userId });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), BOOT_TIMEOUT_MS);
      try {
        const response = await fetch('/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`PROFILE_HTTP_${response.status}`);
        }

        const payload = await response.json();
        logBoot('boot:getProfile:done', { userId, hasProfile: !!payload?.profile });
        return payload?.profile ?? null;
      } catch (error) {
        const reason = error?.name === 'AbortError' ? 'PROFILE_TIMEOUT' : authUnavailableReason(error);
        logBoot('boot:getProfile:error', { userId, error: reason });

        if (reason === 'PROFILE_TIMEOUT' || isAuthUnreachable(error)) {
          markAuthUnavailable(reason);
        }

        throw new Error(reason);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    logBoot('boot:start');
    if (!supabase) {
      logBoot('boot:supabaseClientReady', { ready: false });
      setLoading(false);
      logBoot('boot:done', { loading: false, reason: 'no-supabase-client' });
      return () => {
        mountedRef.current = false;
      };
    }

    logBoot('boot:supabaseClientReady', { ready: true });
    setBrowserSupabaseAuthAutoRefresh(true);

    async function initializeAuth() {
      try {
        if (authUnavailableRef.current) {
          return;
        }

        logBoot('boot:getSession:start');
        const { data: { session: initialSession } } = await withTimeout(
          supabase.auth.getSession(),
          BOOT_TIMEOUT_MS,
          'SESSION_TIMEOUT'
        );
        logBoot('boot:getSession:done', { hasSession: !!initialSession });

        if (!mountedRef.current || authUnavailableRef.current) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (!initialSession?.user) {
          setProfile(null);
          logBoot('boot:routeDecision', { decision: 'no-session', hasSession: false });
          return;
        }

        const isAuthPage = AUTH_BOOT_PUBLIC_ROUTES.has(pathnameRef.current);
        if (isAuthPage) {
          // Never block login/signup rendering on profile fetch.
          logBoot('boot:routeDecision', { decision: 'public-route-skip-profile-block', hasSession: true });
          fetchProfileWithTimeout(initialSession.access_token, initialSession.user.id)
            .then((loadedProfile) => {
              if (mountedRef.current && !authUnavailableRef.current) {
                setProfile(loadedProfile);
              }
            })
            .catch(() => {
              if (mountedRef.current && !authUnavailableRef.current) {
                setProfile(null);
              }
            });
          return;
        }

        try {
          const loadedProfile = await fetchProfileWithTimeout(initialSession.access_token, initialSession.user.id);
          if (mountedRef.current && !authUnavailableRef.current) {
            setProfile(loadedProfile);
          }
          logBoot('boot:routeDecision', {
            decision: loadedProfile ? 'profile-ready' : 'profile-missing',
            hasSession: true,
          });
        } catch (profileError) {
          if (mountedRef.current && !authUnavailableRef.current) {
            setProfile(null);
          }
          logBoot('boot:routeDecision', {
            decision: 'profile-error-fallback-login',
            hasSession: true,
            error: profileError.message,
          });
        }
      } catch (error) {
        const reason = authUnavailableReason(error);
        logBoot('boot:getSession:error', { error: reason });

        if (reason === 'SESSION_TIMEOUT' || isAuthUnreachable(error)) {
          markAuthUnavailable(reason);
          return;
        }

        if (mountedRef.current) {
          setProfile(null);
          setUser(null);
          setSession(null);
        }
        logBoot('boot:routeDecision', {
          decision: 'session-error-fallback-login',
          hasSession: false,
          error: reason,
        });
      } finally {
        if (mountedRef.current && !authUnavailableRef.current) {
          setLoading(false);
          logBoot('boot:done', { loading: false });
        }
      }
    }

    initializeAuth();

    if (!authUnavailableRef.current) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
        if (!mountedRef.current || authUnavailableRef.current) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        try {
          if (event === 'SIGNED_OUT') {
            setProfile(null);
            logBoot('boot:routeDecision', { decision: 'signed-out', hasSession: false });
            return;
          }

          if (!newSession?.user) {
            setProfile(null);
            logBoot('boot:routeDecision', { decision: 'auth-change-no-session', hasSession: false });
            return;
          }

          const isAuthPage = AUTH_BOOT_PUBLIC_ROUTES.has(pathnameRef.current);
          if (isAuthPage) {
            logBoot('boot:routeDecision', { decision: 'auth-change-public-route-skip-profile-block', hasSession: true });
            fetchProfileWithTimeout(newSession.access_token, newSession.user.id)
              .then((loadedProfile) => {
                if (mountedRef.current && !authUnavailableRef.current) {
                  setProfile(loadedProfile);
                }
              })
              .catch(() => {
                if (mountedRef.current && !authUnavailableRef.current) {
                  setProfile(null);
                }
              });
            return;
          }

          try {
            const loadedProfile = await fetchProfileWithTimeout(newSession.access_token, newSession.user.id);
            if (mountedRef.current && !authUnavailableRef.current) {
              setProfile(loadedProfile);
            }
            logBoot('boot:routeDecision', {
              decision: loadedProfile ? 'auth-change-profile-ready' : 'auth-change-profile-missing',
              hasSession: true,
            });
          } catch (profileError) {
            if (mountedRef.current && !authUnavailableRef.current) {
              setProfile(null);
            }
            logBoot('boot:routeDecision', {
              decision: 'auth-change-profile-error-fallback-login',
              hasSession: true,
              error: profileError.message,
            });
          }
        } catch (error) {
          const reason = authUnavailableReason(error);
          if (isAuthUnreachable(error) || reason === 'SESSION_TIMEOUT') {
            markAuthUnavailable(reason);
            return;
          }
        } finally {
          if (mountedRef.current && !authUnavailableRef.current) {
            setLoading(false);
            logBoot('boot:done', { loading: false, source: `auth-state:${event}` });
          }
        }
      });

      subscriptionRef.current = subscription;
    }

    return () => {
      mountedRef.current = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [markAuthUnavailable]);

  // Logout function
  const signOut = async () => {
    if (!supabase || authUnavailableRef.current) {
      console.warn('AuthContext: Cannot sign out - auth unavailable');
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error('AuthContext: Sign out failed:', error.message);
      throw error;
    }
  };

  const value = {
    session,
    user,
    profile,
    loading,
    authUnavailable,
    authUnavailableReason: authUnavailableReasonState,
    isAuthenticated: !!session && !!profile && profile.status === 'approved',
    isAdmin: profile?.role === 'Admin',
    isBroker: profile?.role === 'Broker',
    isSupport: profile?.role === 'Support',
    isApprentice: profile?.role === 'Apprentice',
    hasAdminAccess: profile?.role === 'Admin',
    hasBrokerAccess: ['Admin', 'Broker'].includes(profile?.role),
    hasSupportAccess: ['Admin', 'Broker', 'Support'].includes(profile?.role),
    hasAnyAccess: ['Admin', 'Broker', 'Support', 'Apprentice'].includes(profile?.role),
    markAuthUnavailable,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
