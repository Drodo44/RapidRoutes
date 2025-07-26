// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setError(error.message);
    } else {
      setIsSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1a] to-[#101a2d] flex flex-col">
      {/* Nav Bar */}
      <nav className="flex items-center justify-between px-8 py-4 bg-[#0b1322] shadow-xl">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="RapidRoutes Logo" className="h-10 w-10" />
          <span className="text-2xl font-bold text-cyan-400 drop-shadow-md">
            RapidRoutes
          </span>
        </div>
        <div className="flex gap-6 text-gray-300">
          <a href="/dashboard" className="hover:text-cyan-400 transition">Dashboard</a>
          <a href="/lanes" className="hover:text-cyan-400 transition">Lanes</a>
          <a href="/recap" className="hover:text-cyan-400 transition">Recap</a>
          <a href="/settings" className="hover:text-cyan-400 transition">Settings</a>
          <a href="/profile" className="hover:text-cyan-400 transition">Profile</a>
        </div>
      </nav>

      {/* Login Card */}
      <main className="flex flex-1 items-center justify-center animate-fadeIn">
        <div className="bg-[#141f35] p-10 rounded-2xl shadow-2xl max-w-md w-full border border-cyan-500/40">
          <div className="flex justify-center mb-6">
            <img src="/logo.png" alt="RapidRoutes Logo" className="h-32 w-32" />
          </div>
          <h2 className="text-3xl font-bold text-cyan-400 text-center mb-6">
            Sign In to RapidRoutes
          </h2>
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSent}
            className="w-full p-3 rounded-lg bg-[#1b2a44] text-white border border-cyan-500/30 focus:border-cyan-400 focus:outline-none mb-4"
          />
          <button
            onClick={handleLogin}
            disabled={isSent}
            className="w-full py-3 rounded-lg font-semibold text-black bg-cyan-400 hover:bg-cyan-300 transition shadow-lg hover:shadow-cyan-400/30"
          >
            {isSent ? "Link Sent – Check Email" : "Send Magic Link"}
          </button>
          {error && <p className="text-red-400 text-center mt-4">{error}</p>}
          {isSent && <p className="text-green-400 text-center mt-4">Check your email for the login link.</p>}
          <button
            onClick={() => router.push("/")}
            className="mt-6 w-full py-2 text-gray-300 hover:text-cyan-400 transition"
          >
            Back to Home
          </button>
        </div>
      </main>
    </div>
  );
}

// Add fade-in animation to Tailwind config if not present
