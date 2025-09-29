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
    <div className="min-h-screen flex items-center justify-center bg-[#0b0d12]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mb-4">
            <img src="/logo.png" alt="RapidRoutes Logo" className="h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            <span className="text-blue-400">Rapid</span>
            <span className="text-gray-100">Routes</span>
          </h1>
          <p className="text-gray-400 text-sm">Create your account</p>
        </div>
        <form
          onSubmit={onSubmit}
          className="w-full space-y-4 bg-[#0f1115] border border-gray-800 rounded-xl p-6"
        >
          <div className="space-y-2">
            <label className="block text-sm text-gray-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-gray-300">Password</label>
            <input
              type="password"
              required
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full rounded-lg bg-[#0b0d12] border border-gray-700 px-3 py-2 text-gray-100 outline-none focus:border-gray-500"
            />
          </div>
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Sign up'}
          </button>
          <p className="text-xs text-gray-400 text-center">
            Already have an account?{' '}
            <a className="text-blue-400 hover:text-blue-300 hover:underline" href="/login">
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
