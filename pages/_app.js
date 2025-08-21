// pages/_app.js
import '../styles/globals.css';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import NavBar from '../components/NavBar';
import Head from 'next/head';

const PUBLIC_ROUTES = new Set(['/login', '/signup', '/']);

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);

  // Handle route change loading state
  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  // Initial session + auth listener with enforced protection
  useEffect(() => {
    let mounted = true;

    const checkAndRedirect = (currentSession) => {
      if (!mounted) return;
      const path = router.asPath.split('?')[0];
      
      // Always redirect root path
      if (path === '/') {
        if (currentSession) {
          router.replace('/dashboard');
        } else {
          router.replace('/login');
        }
        return;
      }
      
      // Force login for protected routes
      if (!currentSession && !PUBLIC_ROUTES.has(path)) {
        console.log('No active session, redirecting to login');
        router.push('/login'); // Using push instead of replace for better history
        return;
      }
      
      // Redirect logged-in users away from login/signup
      if (currentSession && PUBLIC_ROUTES.has(path)) {
        console.log('User already logged in, redirecting to dashboard');
        router.push('/dashboard');
      }
    };

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setHydrated(true);
      checkAndRedirect(session);
    });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      checkAndRedirect(newSession);
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
      <main className="min-h-screen bg-gray-900 text-gray-200 flex items-center justify-center">
        <div className="animate-pulse text-lg text-gray-300 font-medium">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading RapidRoutes...
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>RapidRoutes | Freight Brokerage Automation</title>
        <meta name="description" content="Production-grade freight brokerage automation platform for TQL brokers" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
        {showNav && <NavBar />}
        
        {/* Loading indicator */}
        {loading && (
          <div className="fixed top-0 left-0 right-0 h-1 z-50">
            <div className="h-full bg-blue-600 animate-pulse"></div>
          </div>
        )}
        
        <main className={`flex-grow ${showNav ? 'pt-20 pb-12' : ''}`}>
          <Component {...pageProps} />
        </main>
        
        {showNav && (
          <footer className="border-t border-gray-800 py-4 bg-gray-900">
            <div className="container mx-auto px-4 text-center text-xs text-gray-500">
              © 2025 RapidRoutes | Created by Andrew Connellan - Logistics Account Executive at Total Quality Logistics
            </div>
          </footer>
        )}
      </div>
    </>
  );
}
