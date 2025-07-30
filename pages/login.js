import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        shouldCreateUser: false,
        persistSession: rememberMe,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="card">
        <h2 className="text-cyan-400 text-2xl font-bold mb-4">Sign In to RapidRoutes</h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full p-3 rounded-lg bg-gray-800 border border-cyan-400 text-white"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full p-3 rounded-lg bg-gray-800 border border-cyan-400 text-white"
          />
          <label className="flex items-center gap-2 text-gray-300">
            <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} />
            Remember Me
          </label>
          <button
            type="submit"
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold"
          >
            Login
          </button>
          <a href="/reset-password" className="text-cyan-400 hover:underline text-center">Forgot Password?</a>
        </form>
        {error && <div className="text-red-400 mt-4">{error}</div>}
      </div>
    </div>
  );
}
