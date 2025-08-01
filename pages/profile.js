// pages/profile.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../utils/supabaseClient";

export default function Profile() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) router.push("/login");
      else setUser(user);
    };

    loadUser();
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#111827] text-white">
      <h1 className="text-4xl font-bold mb-4 text-neon-blue">My Profile</h1>
      <div className="bg-[#1a2236] p-8 rounded-2xl shadow-2xl max-w-md w-full">
        {user ? (
          <div className="space-y-4">
            <div>
              <span className="font-semibold text-gray-300">Email:</span>
              <span className="ml-2">{user.email}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-300">User ID:</span>
              <span className="ml-2">{user.id}</span>
            </div>
          </div>
        ) : (
          <div className="text-red-400">Loading...</div>
        )}
      </div>
    </div>
  );
}
