// pages/login.js
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Image from "next/image";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    setMessage(error ? "Login failed." : "Check your email for magic link.");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="bg-[#1e293b] p-8 rounded-xl max-w-md w-full text-center shadow-md">
        <Image src="/logo.png" width={200} height={200} alt="Logo" className="mx-auto" />
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Log In</h2>

        <input
          type="email"
          placeholder="Your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded mb-4 text-black"
        />
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold"
        >
          Send Magic Link
        </button>

        {message && <p className="mt-4 text-yellow-400 text-sm">{message}</p>}
        <Link href="/" className="block mt-6 text-sm text-cyan-300 hover:underline">Back to Home</Link>
      </div>
    </main>
  );
}
