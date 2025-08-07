// pages/admin.js
import React from "react";

export default function Admin() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-4xl font-bold mb-6 text-cyan-400">Admin Dashboard</h1>
      <div className="bg-[#1a2236] rounded-2xl shadow-2xl p-8 w-full max-w-4xl text-center">
        <p className="text-gray-300 text-lg font-medium">
          Admin features coming soon.
          <br />
          You will be able to manage users, approve accounts, and control system-wide access.
        </p>
      </div>
    </div>
  );
}
