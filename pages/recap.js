// pages/recap.js
import { useState, useEffect } from "react";
import Image from "next/image";
import supabase from "../utils/supabaseClient";

export default function Recap() {
  const [lanes, setLanes] = useState([]);

  useEffect(() => {
    const fetchLanes = async () => {
      const { data, error } = await supabase.from("lanes").select("*");
      if (!error) setLanes(data || []);
    };
    fetchLanes();
  }, []);

  return (
    <main className="min-h-screen bg-[#0b1623] text-white px-4 py-10">
      <div className="max-w-6xl mx-auto bg-[#151d2b] rounded-2xl shadow-2xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="RapidRoutes Logo" width={60} height={60} />
            <h1 className="text-3xl font-bold text-neon-blue">
              Active Postings Recap
            </h1>
          </div>
          <p className="text-sm text-gray-400 italic">
            Created by Andrew Connellan – Logistics Account Executive at TQL, Cincinnati, OH
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
              {lanes.length === 0 ? (
                <tr>
                  <td className="p-4 text-center text-gray-400" colSpan={9}>
                    No active lanes found.
                  </td>
                </tr>
              ) : (
                lanes.map((lane) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
