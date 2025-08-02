import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import FloorSpaceCalculator from "../components/FloorSpaceCalculator";
import OversizeChecker from "../components/OversizeChecker";

export default function Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });
  }, []);

  if (!user) return <p className="p-8 text-white">Loading...</p>;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="Logo" className="h-10 w-10" />
          <h1 className="text-2xl font-bold text-cyan-400">Dashboard</h1>
        </div>
        <button
          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
        >
          Logout
        </button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 p-6 rounded-xl shadow-md">
          <h2 className="text-lg font-bold text-emerald-400 mb-2">
            Welcome, {user.email}
          </h2>
          <p className="text-sm text-gray-300">
            Use the tools below to calculate space or check legal limits.
          </p>
        </div>

        <div className="bg-gray-900 p-6 rounded-xl shadow-md">
          <h2 className="text-lg font-bold text-cyan-400 mb-2">Broker Stats</h2>
          <p className="text-sm text-gray-300">
            [📊 KPI trends and AI insights coming soon...]
          </p>
        </div>
      </section>

      {/* SMART TOOLS */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <FloorSpaceCalculator />
        <OversizeChecker />
      </section>
    </main>
  );
}
