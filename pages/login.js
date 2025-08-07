// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import Image from "next/image";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="bg-[#111827] p-10 rounded-2xl shadow-2xl text-center max-w-md w-full">
        <div className="flex justify-center mb-6">
          <Image src="/logo.png" alt="RapidRoutes Logo" width={180} height={180} priority />
        </div>
        <h2 className="mt-2 text-3xl font-bold text-cyan-400">Sign In</h2>
        <form onSubmit={handleLogin} className="mt-6 space-y-4 text-left">
          <div>
            <label className="block mb-1">Email</label>
            <input
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded bg-[#1f2937] border border-cyan-600 text-white"
            />
          </div>
          <div>
            <label className="block mb-1">Password</label>
            <input
              type="password"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-[#1f2937] border border-cyan-600 text-white"
            />
          </div>
          {error && <p className="text-red-400 font-medium">{error}</p>}
          <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 py-3 rounded-xl font-semibold">
            Login
          </button>
        </form>
        <button
          onClick={() => router.push("/signup")}
          className="mt-4 text-cyan-400 hover:underline text-sm"
        >
          Don’t have an account? Sign Up
        </button>
      </div>
    </main>
  );
}
