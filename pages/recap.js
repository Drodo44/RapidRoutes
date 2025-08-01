// pages/recap.js

import { useEffect, useState } from "react";
import supabase from "../utils/supabaseClient";

export default function Recap() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLanes = async () => {
      const { data, error } = await supabase.from("lanes").select("*");
      if (!error) setLanes(data || []);
      setLoading(false);
    };

    fetchLanes();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1623] py-10 px-4 text-white">
      <div className="max-w-6xl mx-auto bg-[#151d2b] rounded-2xl shadow-2xl p-6">
        <h1 className="text-4xl font-bold text-neon-blue mb-8">Active Postings Recap</h1>

        {loading ? (
          <p className="text-blue-400">Loading lanes...</p>
        ) : lanes.length === 0 ? (
          <p>No lanes found.</p>
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
                  <th className="p-3">Length</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">RRSI</th>
                  <th className="p-3">Comment</th>
                </tr>
              </thead>
              <tbody>
                {lanes.map((lane) => (
                  <tr key={lane.id} className="even:bg-[#1a2437] odd:bg-[#202b42]">
                    <td className="p-3">{lane.origin_city}, {lane.origin_state}</td>
                    <td className="p-3">{lane.dest_city}, {lane.dest_state}</td>
                    <td className="p-3">{lane.equipment}</td>
                    <td className="p-3">{lane.weight}</td>
                    <td className="p-3">{lane.date}</td>
                    <td className="p-3">{lane.length}</td>
                    <td className="p-3">{lane.status || "Active"}</td>
                    <td className="p-3 font-bold text-neon-green">{lane.rrs || "—"}</td>
                    <td className="p-3">{lane.comment || ""}</td>
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
