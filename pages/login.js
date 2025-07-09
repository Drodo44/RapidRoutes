import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Image from "next/image";
import { useRouter } from "next/router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) {
        setError(error.message);
      } else {
        setIsSent(true);
      }
    } catch (err) {
      setError("Something went wrong.");
    }
  };

  return (
    <main className="flex flex-col min-h-screen items-center justify-center bg-gray-950">
      <div className="bg-gray-900 shadow-2xl rounded-2xl p-10 flex flex-col items-center w-full max-w-md">
        <Image src="/logo.png" alt="RapidRoutes Logo" width={80} height={80} priority />
        <h2 className="text-2xl font-semibold mt-4 text-white">Sign In to RapidRoutes</h2>
        <form onSubmit={handleLogin} className="w-full mt-6 flex flex-col gap-5">
          <input
            className="p-3 rounded-xl bg-gray-800 text-white border border-blue-400 focus:outline-none"
            type="email"
            placeholder="Your email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSent}
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg transition"
            disabled={isSent}
          >
            {isSent ? "Link Sent" : "Send Login Link"}
          </button>
        </form>
        {isSent && (
          <p className="text-green-400 text-center mt-4">
            Check your email for the login link!
          </p>
        )}
        {error && (
          <p className="text-red-400 text-center mt-4">{error}</p>
        )}
        <div className="mt-4">
          <button
            className="text-blue-300 hover:underline"
            onClick={() => router.push("/")}
          >
            Back to Home
          </button>
        </div>
      </div>
    </main>
  );
}
