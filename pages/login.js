import { useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message);
    else setIsSent(true);
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="bg-[#141f35]/70 backdrop-blur-md p-10 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-cyan-500/30">
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
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSent}
          className="mb-4"
        />
        <button
          onClick={handleLogin}
          disabled={isSent}
          className="w-full py-3 rounded-lg font-semibold text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg hover:shadow-cyan-400/30 transition"
        >
          {isSent ? "Link Sent – Check Email" : "Send Magic Link"}
        </button>
        {error && <p className="text-red-400 mt-4">{error}</p>}
        {isSent && (
          <p className="text-green-400 mt-4">
            Check your email for the login link.
          </p>
        )}
        <p className="text-xs text-white mt-8 opacity-90">
          Created by Andrew Connellan – Logistics Account Executive at TQL HQ: Cincinnati, OH
        </p>
      </div>
    </div>
  );
}
