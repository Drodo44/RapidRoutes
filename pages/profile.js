// pages/profile.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient.js";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [showRrsi, setShowRrsi] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user || null);
      if (!user) return;
      const { data } = await supabase.from("user_prefs").select("*").eq("user_id", user.id).single();
      if (data) {
        setTheme(data.theme || "dark");
        setShowRrsi(!!data.show_rrsi);
      }
    })();
  }, []);

  async function save() {
    if (!user) return;
    const { error } = await supabase.from("user_prefs").upsert({
      user_id: user.id,
      theme,
      show_rrsi: showRrsi,
    });
    if (error) setMsg(error.message || "Save failed");
    else setMsg("Saved.");
    // apply theme locally
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-gray-100">
        <div className="card p-6">
          <div className="text-sm">Please <a className="underline" href="/login">log in</a> to edit profile.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 text-gray-100">
      <h1 className="mb-4 text-2xl font-bold">Profile</h1>
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm w-40 text-gray-300">Theme</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="rounded border border-gray-700 bg-gray-900 p-2 text-white"
          >
            <option value="dark">Dark</option>
            <option value="light">Light (beta)</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm w-40 text-gray-300">Show RRSI overlays</label>
          <input type="checkbox" checked={showRrsi} onChange={(e) => setShowRrsi(e.target.checked)} />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={save}
            className="rounded bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
          >
            Save
          </button>
          {msg && <div className="self-center text-sm text-gray-300">{msg}</div>}
        </div>
      </div>
    </main>
  );
}
