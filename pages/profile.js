// pages/profile.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../utils/supabaseClient";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;
      if (!currentUser) {
        router.push("/login");
        return;
      }

      setUser(currentUser);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, role")
        .eq("id", currentUser.id)
        .single();

      setProfile(profileData);
    };

    fetchProfile();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-4xl font-bold mb-4 text-cyan-400">My Profile</h1>
      <div className="bg-[#1a2236] p-8 rounded-2xl shadow-2xl max-w-md w-full">
        {user && profile ? (
          <div className="space-y-4">
            <div>
              <span className="font-semibold text-gray-300">Name:</span>
              <span className="ml-2">{profile.name}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-300">Email:</span>
              <span className="ml-2">{user.email}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-300">User ID:</span>
              <span className="ml-2">{user.id}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-300">Role:</span>
              <span className="ml-2">{profile.role}</span>
            </div>
          </div>
        ) : (
          <p className="text-red-400">You must be logged in to view your profile.</p>
        )}
      </div>
    </div>
  );
}
