// pages/login.js
import { useState } from "react";
import Head from "next/head";
import { supabase } from "../utils/supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) setMsg(error.message); else window.location.href = "/dashboard";
    setBusy(false);
  }

  return (
    <>
      <Head><title>Login — RapidRoutes</title></Head>
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6 text-gray-100">
        <h1 className="mb-4 text-2xl font-bold">Sign in</h1>
        <form onSubmit={signIn} className="space-y-3 rounded-xl border border-gray-700 bg-[#0f1115] p-4">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email"
                 className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"/>
          <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="Password"
                 className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"/>
          {msg && <div className="text-sm text-red-400">{msg}</div>}
          <button disabled={busy} className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <div className="text-sm text-gray-400">
            No account? <a href="/signup" className="text-blue-300 underline">Sign up</a>
          </div>
        </form>
      </main>
    </>
  );
}
