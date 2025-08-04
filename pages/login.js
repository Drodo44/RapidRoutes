// pages/login.js  – email + password flow (no magic link)
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setErr(error.message);
    else router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#14181F] text-[#E2E8F0]">
      <div className="w-full max-w-sm bg-[#1E222B] p-8 rounded-xl border border-gray-800 space-y-6">
        <h1 className="text-xl font-bold text-center">RapidRoutes Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm"
        />

        {err && <div className="text-red-400 text-sm">{err}</div>}

        <button
          onClick={handleLogin}
          className="w-full py-2 rounded bg-[#4361EE] hover:bg-[#364db9] font-semibold"
        >
          Login
        </button>

        <button
          onClick={() => router.push("/signup")}
          className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-sm"
        >
          Need an account? Sign Up
        </button>
      </div>
    </div>
  );
}
