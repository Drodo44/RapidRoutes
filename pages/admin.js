import { useState } from "react";
import fetchCitiesFromSupabase from "../utils/fetchCities";

export default function AdminPage() {
  const [status, setStatus] = useState(null);

  const handleSyncCities = async () => {
    setStatus("Syncing...");
    try {
      const cities = await fetchCitiesFromSupabase();
      if (!cities.length) throw new Error("No cities returned.");
      window.localStorage.setItem("allCities", JSON.stringify(cities));
      setStatus(`✅ Synced ${cities.length} cities`);
    } catch (err) {
      setStatus("❌ Error syncing: " + err.message);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>

      <button
        onClick={handleSyncCities}
        className="bg-emerald-600 px-4 py-2 rounded hover:bg-emerald-700"
      >
        Sync Cities from Supabase
      </button>

      {status && <p className="mt-4 text-sm">{status}</p>}
    </main>
  );
}
