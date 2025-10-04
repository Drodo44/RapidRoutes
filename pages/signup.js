// pages/signup.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../utils/supabaseClient';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard');
    });
  }, [router]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      // Standard email/password signup. Approval gating is done via your Admin role in-app.
      const { error } = await supabase.auth.signUp({ email, password: pw });
      if (error) throw error;
      // After signup, direct to login (no magic links)
      router.replace('/login');
    } catch (e) {
      setErr(e.message || 'Signup failed');
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
              alt="RapidRoutes Logo" 
              style={{ 
                height: '64px', 
                margin: '0 auto',
                filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.4))'
              }} 
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Create your account</p>
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
              {busy ? 'Creating…' : 'Sign up'}
            </button>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
              Already have an account?{' '}
              <a style={{ color: 'var(--primary)', textDecoration: 'none' }} href="/login">
                Sign in
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
