// pages/index.js - Root redirector
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    });
  }, []);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: 'var(--bg-primary)' 
    }}>
      <div style={{ 
        fontSize: '14px', 
        color: 'var(--text-secondary)', 
        fontWeight: 500, 
        display: 'flex', 
        alignItems: 'center' 
      }}>
        <svg 
          style={{ 
            animation: 'spin 1s linear infinite', 
            marginRight: 'var(--space-3)', 
            height: '20px', 
            width: '20px', 
            color: 'var(--primary)' 
          }} 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading RapidRoutes...
      </div>
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
