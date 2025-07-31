import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useRouter } from "next/router";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Apprentice");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password: crypto.randomUUID().slice(0, 16) + "Rr!",
    });

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data?.user?.id) {
      const { error: pendingError } = await supabase
        .from("pending_users")
        .insert([{ id: data.user.id, email, name, role }]);

      if (pendingError) {
        setError("Error saving user. Contact support.");
      } else {
        setMessage("Signup successful. Waiting for admin approval.");
      }
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <div className="bg-gray-900 p-6 rounded-xl shadow-md max-w-md w-full">
        <h1 className="text-cyan-400 text-2xl font-bold mb-4 text-center">Create Account</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email address"
            className="p-3 rounded-lg bg-gray-800 border border-cyan-400 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Full name"
            className="p-3 rounded-lg bg-gray-800 border border-cyan-400 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="p-3 rounded-lg bg-gray-800 border border-cyan-400 text-white"
          >
            <option value="Apprentice">Apprentice</option>
            <option value="Broker">Broker</option>
            <option value="Support">Support</option>
          </select>
          <button
            type="submit"
            className="w-full p-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-semibold"
          >
            Sign Up
          </button>
        </form>
        {message && <p className="text-green-400 mt-4">{message}</p>}
        {error && <p className="text-red-400 mt-4">{error}</p>}
        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-cyan-300 hover:underline">
            Already have an account? Log in
          </a>
        </div>
      </div>
    </main>
  );
}
