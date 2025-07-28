// /pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
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
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="card">
        <Image src="/logo.png" alt="RapidRoutes Logo" width={200} height={200} priority />
        <h2 className="text-cyan-400 text-2xl font-bold mt-6 mb-4">Sign In to RapidRoutes</h2>
        <input type="email" placeholder="Your email" value={email}
          onChange={(e) => setEmail(e.target.value)} disabled={isSent}
          className="w-full p-3 rounded-lg bg-gray-800 border border-cyan-400 text-white mb-4" />
        <button onClick={handleLogin} disabled={isSent}
          className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold mb-4">
          {isSent ? "Link Sent" : "Send Login Link"}
        </button>
        {error && <p className="text-red-400">{error}</p>}
        {isSent && <p className="text-green-400">Check your email!</p>}
        <button onClick={() => router.push("/")}
          className="mt-4 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-white">
          Back to Home
        </button>
      </div>
    </div>
  );
}
