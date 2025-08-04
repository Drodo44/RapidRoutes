// pages/profile.js

import { useUser } from "@supabase/auth-helpers-react";
import Navbar from "../components/Navbar";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Profile() {
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white px-4">
        <div className="bg-[#1a2236] p-8 rounded-2xl shadow-2xl max-w-md w-full">
          <h1 className="text-3xl font-bold text-neon-blue mb-6 text-center">My Profile</h1>
          {user ? (
            <div className="space-y-4">
              <div>
                <span className="text-gray-400">Email:</span>
                <span className="ml-2">{user.email}</span>
              </div>
              <div>
                <span className="text-gray-400">User ID:</span>
                <span className="ml-2">{user.id}</span>
              </div>
            </div>
          ) : (
            <p>Loading user...</p>
          )}
        </div>
      </main>
    </>
  );
}
