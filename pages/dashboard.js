import { useState } from 'react';
import Navbar from '../components/Navbar.js';
import FloorSpaceChecker from '../components/FloorSpaceChecker';

export default function Dashboard() {
  const [email] = useState('aconnellan@tql.com');

  return (
    <div className="min-h-screen bg-[#0f1117] text-white px-6 py-6">
      <Navbar />

      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1B1F28] p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-teal-400 mb-2">
            Welcome, {email}
          </h2>
          <p className="text-sm text-gray-300">
            Use the tools below to calculate space or check legal limits.
          </p>
        </div>

        <div className="bg-[#1B1F28] p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-cyan-400 mb-2">
            Broker Stats
          </h2>
          <p className="text-sm text-gray-300">
            📈 KPI trends and AI insights coming soon...
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <FloorSpaceChecker />
      </div>
    </div>
  );
}
