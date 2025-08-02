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
    <main className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <img src="/logo.png" alt="RapidRoutes Logo" className="mx-auto w-40 mb-6" />
        <h2 className="text-2xl font-bold text-center text-cyan-400 mb-4">Sign In to RapidRoutes</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full p-3 rounded bg-gray-800 text-white"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full p-3 rounded bg-gray-800 text-white"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-bold"
          >
            Log In
          </button>
        </form>
        <p className="text-center mt-6 text-gray-400 text-sm">
          Need an account?{" "}
          <a href="/signup" className="text-cyan-400 underline">Sign Up</a>
        </p>
      </div>
    </main>
  );
}
