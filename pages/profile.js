// pages/profile.js

import { useUser } from '@supabase/auth-helpers-react';

export default function Profile() {
  const user = useUser();

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
            {/* Add any other user info you want displayed here */}
          </div>
        ) : (
          <div className="text-red-400">You must be logged in to see your profile.</div>
        )}
      </div>
    </div>
  );
}
