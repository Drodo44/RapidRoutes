// pages/index.js - RapidRoutes Home
// Redirects authenticated users to premium dashboard
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // Authenticated - go to premium dashboard
          router.replace('/dashboard');
        } else {
          // Not authenticated - go to login
          router.replace('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        router.replace('/login');
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  // Show loading while redirecting
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg, #000)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
        <div style={{
          fontSize: '15px',
          color: 'var(--text-secondary, #A3A3A3)',
          fontFamily: 'Inter, sans-serif',
        }}>
          Loading RapidRoutes...
        </div>
      </div>
    </div>
  );
}
