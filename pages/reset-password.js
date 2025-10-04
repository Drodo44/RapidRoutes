// pages/reset-password.js
import Head from "next/head";
import { useState } from "react";
import supabase from "../utils/supabaseClient.js";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setOk(""); setErr("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
    });
    setLoading(false);
    if (error) return setErr(error.message || "Failed to send reset email");
    setOk("Check your email for a reset link.");
  }

  return (
    <>
      <Head><title>Reset password — RapidRoutes</title></Head>
      <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl p-6" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-default)' }}>
          <h1 className="text-xl font-semibold">Reset password</h1>
          <div className="mt-4">
            <label className="mb-1 block text-xs" style={{ color: 'var(--text-tertiary)' }}>Email</label>
            <input
              className="w-full rounded-lg p-2"
              style={{ background: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--border-default)' }}
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          </div>
          {err && <div className="mt-3 text-sm text-red-400">{err}</div>}
          {ok && <div className="mt-3 text-sm text-green-400">{ok}</div>}
          <button
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Sending…" : "Send reset email"}
          </button>
          <div className="mt-4 text-center text-sm">
            <a href="/login" style={{ color: 'var(--text-secondary)' }} className="hover:underline">Back to login</a>
          </div>
        </form>
      </main>
    </>
  );
}
