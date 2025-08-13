// pages/signup.js
import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient.js";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setOk("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password: pass });
    setLoading(false);
    if (error) return setErr(error.message || "Sign up failed");
    setOk("Check your email to verify your account.");
  }

  return (
    <>
      <Head><title>Sign up — RapidRoutes</title></Head>
      <main className="min-h-screen flex items-center justify-center bg-[#0f1115] text-gray-100">
        <form onSubmit={onSubmit} className="w-full max-w-sm rounded-xl border border-gray-700 bg-[#0f1115] p-6">
          <h1 className="text-xl font-semibold">Create account</h1>
          <div className="mt-4">
            <label className="mb-1 block text-xs text-gray-400">Email</label>
            <input
              className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            />
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs text-gray-400">Password</label>
            <input
              className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"
              type="password" value={pass} onChange={(e) => setPass(e.target.value)} required minLength={6}
            />
          </div>
          {err && <div className="mt-3 text-sm text-red-400">{err}</div>}
          {ok && <div className="mt-3 text-sm text-green-400">{ok}</div>}
          <button
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-green-600 px-3 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create account"}
          </button>
          <div className="mt-4 text-center text-sm">
            <a href="/login" className="text-gray-300 hover:underline">Back to login</a>
          </div>
        </form>
      </main>
    </>
  );
}
