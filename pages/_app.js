// pages/_app.js
import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import NavBar from '../components/NavBar';
import Head from 'next/head';

const PUBLIC_ROUTES = new Set(['/login', '/signup', '/']);

function AppContent({ Component, pageProps }) {
  const router = useRouter();
  const [routeLoading, setRouteLoading] = useState(false);
  const { loading, isAuthenticated, session } = useAuth();
  
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
      </Head>
      
      <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col">
        {!loading && <NavBar />}
        
        {/* Loading indicator */}
        {(loading || routeLoading) && (
          <div className="fixed top-0 left-0 right-0 h-1 z-50">
            <div className="h-full bg-blue-600 animate-pulse"></div>
          </div>
        )}
        
        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="text-gray-400 text-lg">Loading RapidRoutes...</div>
          </div>
        ) : (
          <main className="flex-grow pt-20 pb-12">
            <Component {...pageProps} />
          </main>
        )}
        
        <footer className="border-t border-gray-800 py-4 bg-gray-900">
          <div className="container mx-auto px-4 text-center text-xs text-gray-500">
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
    <AuthProvider>
      {mounted ? (
        <AppContent Component={Component} pageProps={pageProps} />
      ) : null}
    </AuthProvider>
  );
}