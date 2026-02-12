// pages/index.js - RapidRoutes Home
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

export default function IndexPage() {
  const router = useRouter();
  const { loading, session, authUnavailable, authUnavailableReason } = useAuth();

  useEffect(() => {
    if (loading || authUnavailable) return;
    const target = session ? '/dashboard' : '/login';
    router.replace(target).catch((error) => {
      console.error('[boot] root redirect failed', error);
    });
  }, [loading, session, authUnavailable, router]);

  if (authUnavailable) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #000)',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '520px', padding: '0 16px' }}>
          <div style={{
            fontSize: '18px',
            color: 'var(--text-primary)',
            fontFamily: 'Inter, sans-serif',
            marginBottom: '8px',
            fontWeight: 600,
          }}>
            Auth service unreachable
          </div>
          <div style={{
            fontSize: '14px',
            color: 'var(--text-secondary, #A3A3A3)',
            fontFamily: 'Inter, sans-serif',
            marginBottom: '14px',
          }}>
            Check Supabase Auth Site URL / Redirect URLs for rapid-routes.vercel.app or Supabase outage.
          </div>
          {authUnavailableReason && (
            <div style={{
              fontSize: '12px',
              color: 'var(--text-secondary, #A3A3A3)',
              fontFamily: 'Inter, sans-serif',
              marginBottom: '14px',
            }}>
              Reason: {authUnavailableReason}
            </div>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              border: '1px solid #374151',
              borderRadius: '8px',
              padding: '8px 14px',
              background: '#111827',
              color: '#E5E7EB',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
