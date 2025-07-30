import { useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined
    });
    if (error) setError(error.message);
    else setMessage("Password reset email sent. Check your inbox.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="card">
        <h2 className="text-cyan-400 text-2xl font-bold mb-4">Reset Password</h2>
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full p-3 rounded-lg bg-gray-800 border border-cyan-400 text-white"
          />
          <button
            type="submit"
            className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold"
          >
            Send Reset Email
          </button>
        </form>
        {message && <div className="text-green-400 mt-4">{message}</div>}
        {error && <div className="text-red-400 mt-4">{error}</div>}
      </div>
    </div>
  );
}
