// pages/settings.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Settings() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    getSession();
  }, []);

  const getSession = async () => {
    const { data } = await supabase.auth.getSession();
    setEmail(data?.session?.user?.email || "");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handleDelete = async () => {
    setStatus("Deleting...");
    // You can implement soft-delete logic or a Supabase function trigger here
    setStatus("Request sent. Manual approval required.");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">Settings</h1>

        <p className="text-sm text-gray-300 mb-4">
          Logged in as <strong>{email}</strong>
        </p>

        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded mb-4 w-full"
        >
          Logout
        </button>

        <button
          onClick={handleDelete}
          className="bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded w-full"
        >
          Request Account Deletion
        </button>

        {status && <p className="text-yellow-400 text-sm mt-3">{status}</p>}
      </div>
    </main>
  );
}
