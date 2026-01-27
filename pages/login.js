// pages/login.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If already signed in, check status
    if (!loading && session) {
      if (profile?.status === 'pending') {
        router.replace('/pending-approval');
      } else if (profile?.status === 'approved') {
        router.replace('/dashboard');
      }
    }
  }, [loading, session, profile, router]);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px',
        padding: '32px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/logo.png"
            alt="RapidRoutes"
            style={{
              height: '240px',
              width: 'auto',
              margin: '0 auto 16px auto',
              display: 'block',
              borderRadius: '50%',
              border: '2px solid #06B6D4',
              boxShadow: '0 0 30px rgba(6, 182, 212, 0.3)'
            }}
          />
          <h2 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#F1F5F9',
            marginTop: '16px',
            marginBottom: '8px'
          }}>
            Welcome Back
          </h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>
            Sign in to your RapidRoutes account
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email" style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#CBD5E1',
              marginBottom: '6px'
            }}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                color: '#F1F5F9',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#06B6D4';
                e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="password" style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#CBD5E1',
              marginBottom: '6px'
            }}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                color: '#F1F5F9',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#06B6D4';
                e.target.style.boxShadow = '0 0 0 3px rgba(6, 182, 212, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(247, 90, 104, 0.1)',
              border: '1px solid rgba(247, 90, 104, 0.5)',
              borderRadius: '8px',
              marginBottom: '16px',
              color: '#F75A68',
              fontSize: '13px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#FFFFFF',
              background: '#06B6D4',
              border: 'none',
              borderRadius: '8px',
              cursor: busy ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)',
              opacity: busy ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!busy) {
                e.target.style.background = '#22D3EE';
                e.target.style.boxShadow = '0 0 30px rgba(6, 182, 212, 0.5)';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = '#06B6D4';
              e.target.style.boxShadow = '0 0 20px rgba(6, 182, 212, 0.3)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            {busy ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p style={{
          fontSize: '13px',
          color: '#94A3B8',
          textAlign: 'center',
          marginTop: '20px'
        }}>
          Don't have an account?{' '}
          <a
            href="/signup"
            style={{
              color: '#06B6D4',
              textDecoration: 'none',
              fontWeight: 500
            }}
            onMouseEnter={(e) => e.target.style.color = '#22D3EE'}
            onMouseLeave={(e) => e.target.style.color = '#06B6D4'}
          >
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
