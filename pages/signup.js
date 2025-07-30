import { useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";

const ROLES = ["Admin", "Broker", "Support", "Apprentice"];

export default function Signup() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Broker"
  });
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage("Submitting account request...");
    const { error } = await supabase.from("pending_users").insert([form]);
    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Your account request has been submitted. An admin will review and approve.");
      // Optionally: trigger admin notification here
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="card">
        <h2 className="text-cyan-400 text-2xl font-bold mb-4">Request a RapidRoutes Account</h2>
        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white"
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white"
          />
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white"
          >
            {ROLES.map(r => <option key={r}>{r}</option>)}
          </select>
          <button
            type="submit"
            className="w-full p-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold"
          >
            Request Account
          </button>
        </form>
        {message && <div className="text-cyan-400 mt-4">{message}</div>}
      </div>
    </div>
  );
}
