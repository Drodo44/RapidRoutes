import { useState } from "react";
import { useRouter } from "next/router";
import supabase from "../utils/supabaseClient";
import Image from "next/image";

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "Broker"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { user, error: signupError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: { data: { name: form.name, role: form.role } }
      });
      if (signupError) throw signupError;
      // Create user record in database as well:
      await supabase
        .from("users")
        .insert([{ email: form.email, name: form.name, role: form.role }]);
      router.push("/login");
    } catch (err) {
      setError(err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#090918] via-[#12244d] to-[#080e1e] px-4">
      <div className="max-w-md w-full bg-black/80 rounded-2xl shadow-xl p-8 flex flex-col items-center">
        <Image
          src="/rr-logo.png"
          alt="RapidRoutes Logo"
          width={90}
          height={90}
          className="mb-3"
        />
        <h2 className="text-2xl font-bold text-white mb-2">Sign up for RapidRoutes</h2>
        <p className="text-gray-300 text-center mb-6 text-sm">
          The gold standard platform for brokers.
        </p>
        <form className="w-full space-y-4" onSubmit={handleSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-xl bg-[#1c2342] text-white"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-xl bg-[#1c2342] text-white"
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 rounded-xl bg-[#1c2342] text-white"
          />
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-xl bg-[#1c2342] text-white"
          >
            <option value="Broker">Broker</option>
            <option value="Admin">Admin</option>
            <option value="Support">Support</option>
            <option value="Apprentice">Apprentice</option>
          </select>
          {error && (
            <div className="text-red-400 font-bold text-sm">{error}</div>
          )}
          <button
            type="submit"
            className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow-xl transition"
            disabled={loading}
          >
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        <p className="text-gray-400 text-xs mt-5">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-blue-400 underline font-medium hover:text-cyan-400"
          >
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
