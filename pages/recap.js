// pages/recap.js
import { useEffect, useState } from "react";
import supabase from "../utils/supabaseClient";

export default function Recap() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Active");

  useEffect(() => {
    const fetchLanes = async () => {
      const { data, error } = await supabase.from("lanes").select("*");
      if (!error) setLanes(data || []);
      setLoading(false);
    };
    fetchLanes();
  }, []);

  const filtered = activeTab === "Active"
    ? lanes.filter(l => l.status !== "Queued")
    : lanes.filter(l => l.status === "Queued");

  return (
    <div className="min-h-screen bg-[#0b1623] py-10 px-4 text-white">
      <div className="max-w-6xl mx-auto bg-[#151d2b] rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-neon-blue">Recap</h1>
          <div className="flex gap-4">
            <button
              onClick={() => window.location.href = "/api/export/dat"}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-semibold"
            >
              Export CSV
            </button>
            <button
              onClick={() => window.location.href = "/api/export/recap"}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl font-semibold"
            >
              Export XLSX
            </button>
          </div>
        </div>

        <div className="flex gap-6 mb-6">
          <button onClick={() => setActiveTab("Active")} className={`px-4 py-1.5 rounded ${activeTab === "Active" ? "bg-cyan-700" : "bg-gray-800"}`}>
            Active
          </button>
          <button onClick={() => setActiveTab("Queued")} className={`px-4 py-1.5 rounded ${activeTab === "Queued" ? "bg-cyan-700" : "bg-gray-800"}`}>
            Queued
          </button>
        </div>

        {loading ? (
          <p className="text-blue-400">Loading lanes...</p>
        ) : filtered.length === 0 ? (
          <p>No {activeTab.toLowerCase()} lanes found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-white">
              <thead>
                <tr className="bg-[#233056] text-neon-blue">
                  <th className="p-3">Origin</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Equipment</th>
                  <th className="p-3">Weight</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">RRSI</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lane) => (
                  <tr key={lane.id} className="even:bg-[#1a2437] odd:bg-[#202b42]">
                    <td className="p-3">{lane.origin_city}, {lane.origin_state}</td>
                    <td className="p-3">{lane.dest_city}, {lane.dest_state}</td>
                    <td className="p-3">{lane.equipment}</td>
                    <td className="p-3">{lane.weight}</td>
                    <td className="p-3">{lane.date}</td>
                    <td className="p-3">{lane.status || "Active"}</td>
                    <td className="p-3 font-bold">{lane.rrs || "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
