// contexts/AuthContext.js
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';

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
  const bootStartRef = useRef(Date.now());
  const pathnameRef = useRef(router.pathname);

  useEffect(() => {
    pathnameRef.current = router.pathname;
  }, [router.pathname]);

  useEffect(() => {
    let mounted = true;
    bootStartRef.current = Date.now();

    const logBoot = (step, extra = {}) => {
      console.log('[boot]', {
        step,
        elapsedMs: Date.now() - bootStartRef.current,
        pathname: pathnameRef.current,
        ...extra,
      });
    };

    const fetchProfileWithTimeout = async (accessToken, userId) => {
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
        const reason = error?.name === 'AbortError' ? 'PROFILE_TIMEOUT' : error?.message || 'PROFILE_UNKNOWN_ERROR';
        logBoot('boot:getProfile:error', { userId, error: reason });
        throw new Error(reason);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // Skip on server-side (supabase is null during SSR)
    logBoot('boot:start');
    if (!supabase) {
      logBoot('boot:supabaseClientReady', { ready: false });
      setLoading(false);
      logBoot('boot:done', { loading: false, reason: 'no-supabase-client' });
      return;
    }
    logBoot('boot:supabaseClientReady', { ready: true });

    async function initializeAuth() {
      try {
        logBoot('boot:getSession:start');
        const { data: { session: initialSession } } = await withTimeout(
          supabase.auth.getSession(),
          BOOT_TIMEOUT_MS,
          'SESSION_TIMEOUT'
        );
        logBoot('boot:getSession:done', { hasSession: !!initialSession });

        if (!mounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          const isAuthPage = AUTH_BOOT_PUBLIC_ROUTES.has(pathnameRef.current);
          if (isAuthPage) {
            // Never block login/signup rendering on profile fetch.
            logBoot('boot:routeDecision', { decision: 'public-route-skip-profile-block', hasSession: true });
            fetchProfileWithTimeout(initialSession.access_token, initialSession.user.id)
              .then((loadedProfile) => {
                if (mounted) {
                  setProfile(loadedProfile);
                }
              })
              .catch(() => {
                if (mounted) {
                  setProfile(null);
                }
              });
          } else {
            try {
              const loadedProfile = await fetchProfileWithTimeout(initialSession.access_token, initialSession.user.id);
              if (mounted) {
                setProfile(loadedProfile);
              }
              logBoot('boot:routeDecision', {
                decision: loadedProfile ? 'profile-ready' : 'profile-missing',
                hasSession: true,
              });
            } catch (profileError) {
              if (mounted) {
                setProfile(null);
              }
              logBoot('boot:routeDecision', {
                decision: 'profile-error-fallback-login',
                hasSession: true,
                error: profileError.message,
              });
            }
          }
        } else {
          if (mounted) {
            setProfile(null);
          }
          logBoot('boot:routeDecision', { decision: 'no-session', hasSession: false });
        }
      } catch (error) {
        logBoot('boot:getSession:error', { error: error?.message || 'UNKNOWN_SESSION_ERROR' });
        if (mounted) {
          setProfile(null);
          setUser(null);
          setSession(null);
        }
        logBoot('boot:routeDecision', {
          decision: 'session-error-fallback-login',
          hasSession: false,
        });
      } finally {
        if (mounted) {
          setLoading(false);
          logBoot('boot:done', { loading: false });
        }
      }
    }

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {

      if (!mounted) return;

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
              if (mounted) {
                setProfile(loadedProfile);
              }
            })
            .catch(() => {
              if (mounted) {
                setProfile(null);
              }
            });
          return;
        }

        try {
          const loadedProfile = await fetchProfileWithTimeout(newSession.access_token, newSession.user.id);
          if (mounted) {
            setProfile(loadedProfile);
          }
          logBoot('boot:routeDecision', {
            decision: loadedProfile ? 'auth-change-profile-ready' : 'auth-change-profile-missing',
            hasSession: true,
          });
        } catch (profileError) {
          if (mounted) {
            setProfile(null);
          }
          logBoot('boot:routeDecision', {
            decision: 'auth-change-profile-error-fallback-login',
            hasSession: true,
            error: profileError.message,
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
          logBoot('boot:done', { loading: false, source: `auth-state:${event}` });
        }
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Logout function
  const signOut = async () => {
    if (!supabase) {
      console.warn('AuthContext: Cannot sign out - Supabase not initialized');
      return;
    }
    try {
      console.log('AuthContext: Signing out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthContext: Sign out error:', error);
        throw error;
      }
      // Clear local state
      setSession(null);

      setUser(null);
      setProfile(null);
      console.log('AuthContext: Sign out complete');
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
    isAuthenticated: !!session && !!profile && profile.status === 'approved',
    isAdmin: profile?.role === 'Admin',
    isBroker: profile?.role === 'Broker',
    isSupport: profile?.role === 'Support',
    isApprentice: profile?.role === 'Apprentice',
    // Helper functions for permission checks
    hasAdminAccess: profile?.role === 'Admin',
    hasBrokerAccess: ['Admin', 'Broker'].includes(profile?.role),
    hasSupportAccess: ['Admin', 'Broker', 'Support'].includes(profile?.role),
    hasAnyAccess: ['Admin', 'Broker', 'Support', 'Apprentice'].includes(profile?.role),
    // Auth actions
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
