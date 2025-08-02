// pages/dashboard.js
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [role, setRole] = useState("Broker");

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4 text-cyan-400">Welcome, {role}</h1>
      <p className="text-sm text-gray-400 mb-6">This is your real-time command center.</p>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-gray-800 p-4 rounded shadow-md border border-gray-700">
          <h2 className="text-xl font-semibold mb-2 text-white">Active Lanes</h2>
          <p className="text-4xl text-emerald-400">14</p>
        </div>

        <div className="bg-gray-800 p-4 rounded shadow-md border border-gray-700">
          <h2 className="text-xl font-semibold mb-2 text-white">Today’s Exports</h2>
          <p className="text-4xl text-indigo-400">3</p>
        </div>

        <div className="bg-gray-800 p-4 rounded shadow-md border border-gray-700">
          <h2 className="text-xl font-semibold mb-2 text-white">System Health</h2>
          <p className="text-4xl text-amber-400">✓</p>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-2 text-white">Recent Activity</h2>
        <ul className="space-y-2 text-sm text-gray-300">
          <li>✅ Exported DAT CSV for 4 lanes</li>
          <li>✅ Recap report generated</li>
          <li>✅ Admin approved user john@example.com</li>
          <li>✅ 22 postings auto-generated</li>
        </ul>
      </div>
    </div>
  );
}
