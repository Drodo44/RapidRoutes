// pages/_app.js
import '../styles/enterprise.css';  // Load FIRST for CSS variables
import '../styles/globals.css';   // Load AFTER so Tailwind respects variables
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import NavBar from '../components/Navbar.jsx';
import ThemeToggle from '../components/ThemeToggle';
import useKeyboardShortcuts from '../hooks/useKeyboardShortcuts';
import Head from 'next/head';
import ErrorBoundary from '../components/ErrorBoundary';
import { ThemeProvider } from 'next-themes';

const PUBLIC_ROUTES = new Set(['/login', '/signup', '/']);

function AppContent({ Component, pageProps }) {
  const router = useRouter();
  const [routeLoading, setRouteLoading] = useState(false);
  const { loading, isAuthenticated, session } = useAuth();
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  
  useEffect(() => {
    console.log('AppContent loading state:', { 
      loading, 
      isAuthenticated, 
      hasSession: !!session 
    });
  }, [loading, isAuthenticated, session]);

  // Global auth redirect for protected routes
  useEffect(() => {
    if (!loading && !PUBLIC_ROUTES.has(router.pathname)) {
      if (!isAuthenticated) {
        console.log('Redirecting to login - not authenticated');
        router.replace('/login');
      }
    }
  }, [loading, isAuthenticated, router]);

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

  return (
    <>
      <Head>
        <title>RapidRoutes | Freight Brokerage Automation</title>
        <meta name="description" content="Production-grade freight brokerage automation platform for TQL brokers" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      
      <ThemeToggle />
      
      <div className="min-h-screen flex flex-col">
        {!loading && <NavBar />}
        
        {/* Loading indicator */}
        {(loading || routeLoading) && (
          <div className="fixed top-0 left-0 right-0 h-1 z-50" style={{ background: 'var(--primary)' }}>
            <div className="h-full animate-pulse" style={{ background: 'var(--primary-hover)' }}></div>
          </div>
        )}
        
        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-lg" style={{ color: 'var(--text-secondary)' }}>Loading RapidRoutes...</div>
          </div>
        ) : (
          <main className="flex-grow pt-20 pb-12" style={{ background: 'var(--bg-primary)' }}>
            <ErrorBoundary componentName={Component.displayName || Component.name || 'Page'}>
              <Component {...pageProps} />
            </ErrorBoundary>
          </main>
        )}
        
        <footer className="py-4" style={{ 
          borderTop: '1px solid var(--border-default)', 
          background: 'var(--bg-secondary)' 
        }}>
          <div className="container mx-auto px-4 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
            © 2025 RapidRoutes | Created by Andrew Connellan - Logistics Account Executive at Total Quality Logistics
          </div>
        </footer>
      </div>
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
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
        <AuthProvider>
          {mounted ? (
            <AppContent Component={Component} pageProps={pageProps} />
          ) : null}
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}