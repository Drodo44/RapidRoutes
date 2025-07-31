// /pages/profile.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { useRouter } from "next/router";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
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
      .select("email, name, role, active")
      .eq("id", user.id)
      .single();

    if (!error) setProfile(data);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">My Profile</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-4">
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Name:</strong> {profile.name || "N/A"}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>Status:</strong> {profile.active ? "✅ Active" : "❌ Inactive"}</p>
        </div>
      )}
    </main>
  );
}
