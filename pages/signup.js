// pages/signup.js
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

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

    const { data, error } = await supabase.auth.signUp({
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
    <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4 text-white">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
        <img src="/logo.png" alt="RapidRoutes Logo" className="mx-auto w-[300px] mb-6" />
        <h1 className="text-2xl font-bold text-cyan-400 mb-2">Create Your Account</h1>
        <p className="text-gray-300 mb-6">Redefine the game. Outsmart the lane.</p>
        <form onSubmit={handleSignup} className="space-y-4 text-left">
          <label>Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 text-white"
          />
          <label>Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 text-white"
          />
          <label>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 text-white"
          />
          <label>Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 text-white"
          >
            <option>Admin</option>
            <option>Broker</option>
            <option>Support</option>
            <option>Apprentice</option>
          </select>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold mt-4"
          >
            Sign Up
          </button>
        </form>
        <p className="mt-6 text-sm text-gray-400">
          Already have an account?{" "}
          <a href="/login" className="text-cyan-400 underline">Log In</a>
        </p>
      </div>
    </main>
  );
}
