// pages/signup.js
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Image from "next/image";
import Link from "next/link";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage("Creating account...");

    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      setMessage("Signup failed: " + error.message);
      return;
    }

    const userId = data?.user?.id;
    if (userId) {
      await supabase.from("profiles").insert([
        {
          id: userId,
          email,
          name,
          role: "Apprentice",
          active: true
        }
      ]);
      setMessage("Account created. Awaiting admin approval.");
    } else {
      setMessage("Signup successful. Please check your email.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <div className="bg-[#1e293b] p-8 rounded-xl max-w-md w-full text-center shadow-md">
        <Image src="/logo.png" width={200} height={200} alt="Logo" className="mx-auto" />
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Sign Up</h2>

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded text-black"
          />
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded text-black"
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded text-black"
          />
          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded font-semibold"
          >
            Create Account
          </button>
        </form>

        {message && <p className="mt-4 text-yellow-400 text-sm">{message}</p>}
        <Link href="/" className="block mt-6 text-sm text-cyan-300 hover:underline">Back to Home</Link>
      </div>
    </main>
  );
}
