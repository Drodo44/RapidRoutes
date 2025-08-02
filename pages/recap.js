import { useEffect, useState } from "react";
import Image from "next/image";
import supabase from "../utils/supabaseClient";
import { getLaneRiskTag, getHeatColor } from "../lib/weatherUtils";

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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Image src="/logo.png" alt="RapidRoutes Logo" width={60} height={60} />
            <h1 className="text-3xl font-bold text-neon-blue">Active Postings Recap</h1>
          </div>
          <p className="text-sm text-gray-400 italic">
            Created by Andrew Connellan – Logistics Account Executive at TQL, Cincinnati, OH
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl">
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
                <th className="p-3">Risk</th>
                <th className="p-3">Selling Point</th>
              </tr>
            </thead>
            <tbody>
              {lanes.length === 0 ? (
                <tr>
                  <td className="p-4 text-center text-gray-400" colSpan={10}>
                    No active lanes found.
                  </td>
                </tr>
              ) : (
                lanes.map((lane) => {
                  const rrs = lane.rrs || 50;
                  const risk = getLaneRiskTag(lane);
                  const bgColor = getHeatColor(rrs);
                  const sellingPoint = lane.comment || risk?.note || "";

                  return (
                    <tr key={lane.id} className="even:bg-[#1a2437] odd:bg-[#202b42]">
                      <td className="p-3">{lane.origin_city}, {lane.origin_state}</td>
                      <td className="p-3">{lane.dest_city}, {lane.dest_state}</td>
                      <td className="p-3">{lane.equipment}</td>
                      <td className="p-3">{lane.weight}</td>
                      <td className="p-3">{lane.date}</td>
                      <td className="p-3">{lane.length}</td>
                      <td className="p-3">{lane.status || "Active"}</td>
                      <td className={`p-3 font-bold ${bgColor}`}>{rrs}</td>
                      <td className="p-3">{risk?.label || "—"}</td>
                      <td className="p-3 text-gray-200">{sellingPoint}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
