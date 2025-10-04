// pages/login.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If already signed in, kick to dashboard
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
    });
  }, [router]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) throw error;
      router.replace('/dashboard');
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
      backgroundColor: 'var(--bg-primary)' 
    }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 var(--space-4)' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <img src="/logo.png" alt="RapidRoutes Logo" style={{ height: '64px', margin: '0 auto' }} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            <span style={{ color: 'var(--primary)' }}>Rapid</span>
            <span>Routes</span>
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
