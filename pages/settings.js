import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import TopNav from "../components/TopNav";

export default function Settings() {
  const [userId, setUserId] = useState(null);
  const [form, setForm] = useState({
    trailer: "FD",
    weightMin: 46750,
    weightMax: 48000,
    contactMethod: "Email",
  });

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);

      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setForm({
          trailer: data.trailer || "FD",
          weightMin: data.weight_min || 46750,
          weightMax: data.weight_max || 48000,
          contactMethod: data.contact_method || "Email",
        });
      }
    };

    load();
  }, []);

  const saveSettings = async () => {
    if (!userId) return;

    const updates = {
      user_id: userId,
      trailer: form.trailer,
      weight_min: form.weightMin,
      weight_max: form.weightMax,
      contact_method: form.contactMethod,
    };

    await supabase.from("settings").upsert(updates);
    alert("Settings saved.");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-8">
      <TopNav />
      <div className="max-w-xl mx-auto bg-gray-900 p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold text-cyan-400 mb-4">Settings</h1>

        <div className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Default Trailer Type</label>
            <input
              type="text"
              className="w-full p-2 rounded bg-gray-800 text-white"
              value={form.trailer}
              onChange={(e) => setForm({ ...form, trailer: e.target.value })}
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Weight Range (lbs)</label>
            <div className="flex space-x-2">
              <input
                type="number"
                className="w-1/2 p-2 rounded bg-gray-800 text-white"
                placeholder="Min"
                value={form.weightMin}
                onChange={(e) =>
                  setForm({ ...form, weightMin: parseInt(e.target.value) })
                }
              />
              <input
                type="number"
                className="w-1/2 p-2 rounded bg-gray-800 text-white"
                placeholder="Max"
                value={form.weightMax}
                onChange={(e) =>
                  setForm({ ...form, weightMax: parseInt(e.target.value) })
                }
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-1">Default Contact Method</label>
            <select
              className="w-full p-2 rounded bg-gray-800 text-white"
              value={form.contactMethod}
              onChange={(e) => setForm({ ...form, contactMethod: e.target.value })}
            >
              <option value="Email">Email</option>
              <option value="Primary Phone">Primary Phone</option>
            </select>
          </div>

          <button
            onClick={saveSettings}
            className="w-full bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-semibold"
          >
            Save Settings
          </button>
        </div>
      </div>
    </main>
  );
}
