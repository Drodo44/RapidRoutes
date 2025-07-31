import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useRouter } from "next/router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      return;
    }

    const userId = data?.user?.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("active")
      .eq("id", userId)
      .single();

    if (!profile?.active) {
      setError("Account not yet approved.");
      return;
    }

    router.push("/dashboard");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4">
      <div className="bg-gray-900 p-6 rounded-xl shadow-md max-w-md w-full">
        <h1 className="text-cyan-400 text-2xl font-bold mb-4 text-center">Login</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email address"
            className="p-3 rounded-lg bg-gray-800 border border-cyan-400 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="p-3 rounded-lg bg-gray-800 border border-cyan-400 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold"
          >
            Login
          </button>
        </form>
        {error && <p className="text-red-400 mt-4">{error}</p>}
        <div className="mt-4 text-center">
          <a href="/reset-password" className="text-sm text-cyan-300 hover:underline">
            Forgot your password?
          </a>
        </div>
      </div>
    </main>
  );
}
