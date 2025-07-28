import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
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
      options: { data: { name, role } }
    });
    if (error) {
      setError(error.message);
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
        <Image src="/logo.png" alt="RapidRoutes Logo" width={200} height={200} priority />
        <h2 className="text-cyan-400 text-2xl font-bold mt-6 mb-4">Create Your RapidRoutes Account</h2>
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white"
          >
            <option>Admin</option>
            <option>Broker</option>
            <option>Support</option>
            <option>Apprentice</option>
          </select>
          {error && <div className="text-red-400">{error}</div>}
          <button
            type="submit"
            className="w-full p-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold"
          >
            Sign Up
          </button>
          <a href="/login" className="text-cyan-400 hover:underline">
            Already have an account? Login
          </a>
        </form>
      </div>
    </div>
  );
}
