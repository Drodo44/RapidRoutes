import { useEffect, useState } from "react";
import supabase from "../utils/supabaseClient";
import Navbar from "../components/Navbar";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: session } = await supabase.auth.getSession();
      const currentUser = session?.session?.user;
      if (!currentUser) return;

      setUser(currentUser);

      const { data, error } = await supabase.from("profiles").select("*").eq("id", currentUser.id).single();
      if (error) console.error(error);
      else setProfile(data);
    };

    loadProfile();
  }, []);

  if (!user || !profile) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-950 text-white py-12 px-4">
        <div className="max-w-lg mx-auto bg-[#1a2236] p-6 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold text-cyan-400 mb-4">Profile</h1>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {profile.role}</p>
        </div>
      </main>
    </>
  );
}
