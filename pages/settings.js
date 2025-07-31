import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useRouter } from "next/router";

export default function Settings() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: session } = await supabase.auth.getSession();
    const user = session?.data?.session?.user;
    if (!user) return router.push("/login");

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!error) setProfile(data);
    setLoading(false);
  }

  async function handleUpdate() {
    setMessage("");
    const { error } = await supabase
      .from("profiles")
      .update({ name: profile.name })
      .eq("id", profile.id);

    if (!error) setMessage("Profile updated!");
  }

  if (loading) return <div className="text-white p-8">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">Settings</h1>
      <div className="space-y-4 max-w-md">
        <label className="block">
          <span className="text-white">Name</span>
          <input
            type="text"
            value={profile.name || ""}
            onChange={(e) =>
              setProfile((prev) => ({ ...prev, name: e.target.value }))
            }
            className="mt-1 block w-full bg-gray-800 border border-cyan-400 text-white p-2 rounded-lg"
          />
        </label>
        <button
          onClick={handleUpdate}
          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-white font-semibold"
        >
          Save Changes
        </button>
        {message && <p className="text-green-400 mt-2">{message}</p>}
      </div>
    </main>
  );
}
