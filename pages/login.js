// pages/login.js
import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import Image from "next/image";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Login failed: " + error.message);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile || !profile.active) {
      setError("Access denied. Please contact admin.");
      return;
    }

    const role = profile.role || "Apprentice";
    if (role === "Admin") router.push("/admin");
    else if (role === "Broker") router.push("/dashboard");
    else if (role === "Support") router.push("/dashboard");
    else router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <form
        onSubmit={handleLogin}
        className="bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-md space-y-4"
      >
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="RapidRoutes Logo" width={180} height={180} />
        </div>
        <h2 className="text-2xl font-semibold text-center text-cyan-400">Sign In to RapidRoutes</h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg"
        >
          Log In
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full mt-2 text-center text-sm text-cyan-300 hover:underline"
        >
          Back to Home
        </button>
      </form>
    </div>
  );
}
