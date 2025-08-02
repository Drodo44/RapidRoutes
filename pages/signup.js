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
        data: { name, role }
      }
    });

    if (error) {
      setError(error.message);
    } else {
      router.push("/login");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <form onSubmit={handleSignup} className="bg-gray-900 p-8 rounded-2xl shadow-2xl w-full max-w-md space-y-4">
        <img src="/logo.png" alt="RapidRoutes Logo" className="mx-auto w-32 mb-4" />
        <h2 className="text-2xl font-bold text-cyan-400 text-center">Sign Up</h2>
        <input
          type="text"
          required
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded bg-gray-800"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded bg-gray-800"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded bg-gray-800"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full p-3 rounded bg-gray-800"
        >
          <option>Admin</option>
          <option>Broker</option>
          <option>Support</option>
          <option>Apprentice</option>
        </select>
        {error && <p className="text-red-400">{error}</p>}
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold">
          Create Account
        </button>
      </form>
    </main>
  );
}
