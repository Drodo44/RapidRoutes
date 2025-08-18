// pages/signup.js
import { useState } from "react";
import Head from "next/head";
import { supabase } from "../utils/supabaseClient";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function signUp(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const { error } = await supabase.auth.signUp({ email, password: pw });
    if (error) setMsg(error.message);
    else window.location.href = "/dashboard";
    setBusy(false);
  }

  return (
    <>
      <Head><title>Sign up — RapidRoutes</title></Head>
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6 text-gray-100">
        <h1 className="mb-4 text-2xl font-bold">Create account</h1>
        <form onSubmit={signUp} className="space-y-3 rounded-xl border border-gray-700 bg-[#0f1115] p-4">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email"
                 className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"/>
          <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="Password"
                 className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2 text-white"/>
          {msg && <div className="text-sm text-red-400">{msg}</div>}
          <button disabled={busy} className="w-full rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
      </main>
    </>
  );
}
