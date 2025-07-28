import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Profile() {
  const [profile, setProfile] = useState({});

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(data || {});
      }
    };
    loadProfile();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-cyan-400 drop-shadow mb-6">My Profile</h1>
      <div className="bg-[#141f35] p-6 rounded-lg shadow-cyan-glow space-y-4">
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Role:</strong> {profile.role}</p>
        <p><strong>Member Since:</strong> {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : ""}</p>
      </div>
    </div>
  );
}
