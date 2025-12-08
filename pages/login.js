// pages/login.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { session, profile, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If already signed in, check status
    if (!loading && session) {
      if (profile?.status === 'pending') {
        router.replace('/pending-approval');
      } else if (profile?.status === 'approved') {
        router.replace('/dashboard');
      }
      // If rejected or other, maybe stay here or show error?
      // For now, let's assume pending or approved are the main ones to redirect.
    }
  }, [loading, session, profile, router]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
      // The useEffect will handle the redirect based on profile status
    } catch (e) {
      setErr(e.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: 'var(--bg-primary)',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.08) 0%, transparent 50%)'
    }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 var(--space-4)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <img 
              src="/logo.png" 
              alt="RapidRoutes logo" 
              className="mx-auto mb-8 h-40 w-40 rounded-full ring-2 ring-cyan-400 drop-shadow-lg transition-transform duration-300 hover:scale-105"
              style={{
                height: '160px',
                width: '160px',
                margin: '0 auto 32px auto',
                borderRadius: '50%',
                border: '2px solid #06b6d4',
                boxShadow: '0 10px 25px rgba(6, 182, 212, 0.3)',
                transition: 'transform 0.3s ease',
                display: 'block'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            />
          </div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 700, 
            marginBottom: 'var(--space-2)',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em'
          }}>
            RapidRoutes
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Sign in to your account</p>
        </div>
        
        <form
          onSubmit={onSubmit}
          className="card"
          style={{ padding: 'var(--space-6)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className="form-input"
              />
            </div>
            {err && <p style={{ fontSize: '12px', color: 'var(--danger)' }}>{err}</p>}
            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 'var(--space-2)' }}>
              No account?{' '}
              <a style={{ color: 'var(--primary)', textDecoration: 'none' }} href="/signup">
                Create one
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
