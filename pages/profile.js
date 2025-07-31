// pages/profile.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (!error) {
      setProfile(data);
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">My Profile</h1>

        {loading ? (
          <p>Loading...</p>
        ) : profile ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm text-gray-400">Name</h2>
              <p className="text-lg">{profile.name || "—"}</p>
            </div>
            <div>
              <h2 className="text-sm text-gray-400">Email</h2>
              <p className="text-lg">{profile.email}</p>
            </div>
            <div>
              <h2 className="text-sm text-gray-400">Role</h2>
              <p className="text-lg">{profile.role}</p>
            </div>
            <div>
              <h2 className="text-sm text-gray-400">Active</h2>
              <p className="text-lg">{profile.active ? "Yes" : "No"}</p>
            </div>
          </div>
        ) : (
          <p className="text-red-500">Profile not found.</p>
        )}
      </div>
    </main>
  );
}
