import { useState, useEffect } from "react";
import supabase from "../utils/supabaseClient";
import Navbar from "../components/Navbar";

export default function Settings() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: session } = await supabase.auth.getSession();
      const user = session?.session?.user;
      if (!user) return;

      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data);
    };

    loadProfile();
  }, []);

  if (!profile) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-950 text-white py-10 px-4">
        <div className="max-w-lg mx-auto bg-[#1e293b] p-6 rounded-xl shadow">
          <h1 className="text-3xl font-bold text-cyan-400 mb-4">User Settings</h1>
          <p className="mb-2"><strong>Email:</strong> {profile.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
        </div>
      </main>
    </>
  );
}
