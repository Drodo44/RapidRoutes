// pages/profile.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getUserWithRole } from "../utils/authHelpers";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { user } = await getUserWithRole();
      if (user) {
        setUser(user);
        setAllowed(true);
      } else {
        router.push("/login");
      }
    };
    check();
  }, []);

  if (!allowed) return null;

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
          <div className="text-red-400">You must be logged in to see your profile.</div>
        )}
      </div>
    </div>
  );
}
