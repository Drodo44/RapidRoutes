// pages/_app.js
import '../styles/globals.css';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import NavBar from '../components/NavBar';

const PUBLIC_ROUTES = new Set(['/login', '/signup']);

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // Initial session + auth listener
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setHydrated(true);
      const path = router.asPath.split('?')[0];

      if (!session && !PUBLIC_ROUTES.has(path)) {
        router.replace('/login');
      }
      if (session && PUBLIC_ROUTES.has(path)) {
        router.replace('/dashboard');
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      const path = router.asPath.split('?')[0];
      if (!newSession && !PUBLIC_ROUTES.has(path)) {
        router.replace('/login');
      }
      if (newSession && PUBLIC_ROUTES.has(path)) {
        router.replace('/dashboard');
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, [router]);

  const showNav = useMemo(() => {
    const path = router.asPath.split('?')[0];
    return session && !PUBLIC_ROUTES.has(path);
  }, [router.asPath, session]);

  // Prevent flash-of-redirect
  if (!hydrated) {
    return (
      <main className="min-h-screen bg-[#0b0d12] text-gray-200 flex items-center justify-center">
        <div className="animate-pulse text-sm text-gray-400">Loading…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0d12] text-gray-200">
      {showNav && <NavBar />}
      <div className={showNav ? 'pt-16' : ''}>
        <Component {...pageProps} />
      </div>
    </main>
  );
}
