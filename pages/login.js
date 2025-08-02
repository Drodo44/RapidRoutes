// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Login failed: Invalid email or password.");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 text-white">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
        <img src="/logo.png" alt="RapidRoutes Logo" className="mx-auto w-[300px] mb-6" />
        <h1 className="text-2xl font-bold text-cyan-400 mb-2">Welcome to RapidRoutes</h1>
        <p className="text-gray-300 mb-6">Redefine the game. Outsmart the lane.</p>
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-gray-800"
          />
          <label>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-gray-800"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-bold mt-4"
          >
            Log In
          </button>
        </form>
        <p className="mt-6 text-sm text-gray-400">
          Don’t have an account?{" "}
          <a href="/signup" className="text-cyan-400 underline">Sign Up</a>
        </p>
      </div>
    </main>
  );
}
