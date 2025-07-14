// pages/login.js
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Magic login link sent! Check your email.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="bg-gray-900 p-8 rounded-xl shadow-xl max-w-md w-full text-center border border-blue-800">
        <img src="/logo.png" alt="Logo" className="mx-auto mb-6 w-40 h-40" />
        <h1 className="text-3xl font-bold mb-4 text-cyan-400">Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 rounded-lg bg-gray-800 text-white border border-gray-700"
          />
          <button
            type="submit"
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-lg"
          >
            Send Magic Link
          </button>
        </form>
        {message && <p className="mt-4 text-green-400">{message}</p>}
        {error && <p className="mt-4 text-red-500">{error}</p>}
        <p className="mt-6 text-sm text-gray-400">
          Need an account?{" "}
          <Link href="/signup" className="text-emerald-400 hover:underline">
            Sign Up
          </Link>
        </p>
        <p className="mt-2 text-sm text-gray-400">
          <Link href="/" className="text-cyan-400 hover:underline">
            Back to Home
          </Link>
        </p>
      </div>
    </main>
  );
}
