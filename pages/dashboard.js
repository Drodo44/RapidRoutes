// pages/dashboard.js

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import supabase from "../utils/supabaseClient";
import Navbar from "../components/Navbar";

export default function Dashboard() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchLanes = async () => {
      const { data, error } = await supabase.from("lanes").select("*");
      if (!error) setLanes(data || []);
      setLoading(false);
    };

    fetchLanes();
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-neon-blue mb-6">Broker Dashboard</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#1a2236] p-4 rounded-xl shadow">
              <h2 className="text-gray-400 text-sm mb-1">Total Lanes</h2>
              <div className="text-2xl font-bold">{lanes.length}</div>
            </div>
            <div className="bg-[#1a2236] p-4 rounded-xl shadow">
              <h2 className="text-gray-400 text-sm mb-1">Active Brokers</h2>
              <div className="text-2xl font-bold">5</div>
            </div>
            <div className="bg-[#1a2236] p-4 rounded-xl shadow">
              <h2 className="text-gray-400 text-sm mb-1">Postings Today</h2>
              <div className="text-2xl font-bold">132</div>
            </div>
            <div className="bg-[#1a2236] p-4 rounded-xl shadow">
              <h2 className="text-gray-400 text-sm mb-1">Avg RRSI</h2>
              <div className="text-2xl font-bold">94.7</div>
            </div>
          </div>
          <div className="bg-[#151d2b] rounded-xl p-6 shadow">
            <h2 className="text-xl font-semibold text-neon-blue mb-4">Recent Lanes</h2>
            {loading ? (
              <div>Loading lanes...</div>
            ) : lanes.length === 0 ? (
              <div>No lanes found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-neon-blue bg-[#233056]">
                  <tr>
                    <th className="p-2">Origin</th>
                    <th className="p-2">Destination</th>
                    <th className="p-2">Equipment</th>
                    <th className="p-2">Weight</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lanes.map((lane) => (
                    <tr key={lane.id} className="even:bg-[#1a2437] odd:bg-[#202b42]">
                      <td className="p-2">{lane.originCity}, {lane.originState}</td>
                      <td className="p-2">{lane.destCity}, {lane.destState}</td>
                      <td className="p-2">{lane.equipment}</td>
                      <td className="p-2">{lane.weight}</td>
                      <td className="p-2">{lane.status || "Active"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
