// pages/login.js
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0a0f1a] to-[#101a2d] text-white">
      {/* Top Navigation Bar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-cyan-700/40 bg-[#0b1322]">
        <div className="flex-1" />
        <ul className="flex justify-center space-x-12 text-lg font-medium">
          <li><a href="/dashboard" className="hover:text-cyan-400 transition">Dashboard</a></li>
          <li><a href="/lanes" className="hover:text-cyan-400 transition">Lanes</a></li>
          <li><a href="/recap" className="hover:text-cyan-400 transition">Recap</a></li>
          <li><a href="/settings" className="hover:text-cyan-400 transition">Settings</a></li>
          <li><a href="/profile" className="hover:text-cyan-400 transition">Profile</a></li>
        </ul>
        <div className="flex-1 flex justify-end">
          <button className="px-4 py-2 bg-cyan-500 rounded-lg font-semibold text-black hover:bg-cyan-400 transition">
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="bg-[#141f35]/70 backdrop-blur-md p-10 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-cyan-500/30">
          {/* Official Logo with slogan (from /public/logo.png) */}
          <img
            src="/logo.png"
            alt="RapidRoutes Logo"
            className="mx-auto mb-6 w-64 h-auto drop-shadow-lg"
          />

          <h2 className="text-3xl font-bold text-white mb-4 drop-shadow">
            Welcome to RapidRoutes
          </h2>

          <p className="text-cyan-400 mb-6 text-lg">
            Your all-in-one, AI-powered freight brokerage platform.
          </p>

          {/* Email Input */}
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSent}
            className="w-full p-3 rounded-lg bg-[#1b2a44] text-white border border-cyan-500/30 focus:border-cyan-400 focus:outline-none mb-4"
          />

          {/* Send Magic Link Button */}
          <button
            onClick={handleLogin}
            disabled={isSent}
            className="w-full py-3 rounded-lg font-semibold text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg hover:shadow-cyan-400/30 transition mb-4"
          >
            {isSent ? "Link Sent – Check Email" : "Send Magic Link"}
          </button>

          {error && <p className="text-red-400 text-center">{error}</p>}
          {isSent && <p className="text-green-400 text-center">Check your email for the login link.</p>}

          {/* Footer Credit */}
          <p className="text-xs text-white mt-8 opacity-80">
            Created by Andrew Connellan – Logistics Account Executive at TQL HQ: Cincinnati, OH
          </p>
        </div>
      </main>
    </div>
  );
}
