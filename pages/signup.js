// pages/signup.js
import { useState } from "react";
import { useRouter } from "next/router";
import supabase from "../utils/supabaseClient";
import Image from "next/image";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Broker");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      router.push("/login");
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="bg-[#111827] p-10 rounded-2xl shadow-2xl text-center max-w-md w-full">
        <Image src="/logo.png" alt="Logo" width={120} height={120} priority />
        <h2 className="text-3xl font-bold text-cyan-400 mb-6">Sign Up</h2>
        <form onSubmit={handleSignup} className="space-y-4 text-left">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded bg-[#1f2937] border border-cyan-600 text-white"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-[#1f2937] border border-cyan-600 text-white"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-[#1f2937] border border-cyan-600 text-white"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 rounded bg-[#1f2937] border border-cyan-600 text-white"
          >
            <option>Admin</option>
            <option>Broker</option>
            <option>Support</option>
            <option>Apprentice</option>
          </select>
          {error && <p className="text-red-400">{error}</p>}
          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 py-3 rounded-xl font-semibold">
            Sign Up
          </button>
        </form>
      </div>
    </main>
  );
}
