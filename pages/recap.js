// pages/recap.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Recap() {
  const [lanes, setLanes] = useState([]);

  useEffect(() => {
    fetch("/api/lanes") // Replace with real data if not stored
      .then((res) => res.json())
      .then((data) => setLanes(data))
      .catch(console.error);
  }, []);

  return (
    <div className="p-6 bg-gray-950 text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-cyan-400">Recap Dashboard</h1>

      <div className="overflow-auto">
        <table className="min-w-full text-sm bg-gray-800 border border-gray-700">
          <thead>
            <tr className="bg-gray-700 text-white">
              <th className="p-3 text-left">Origin</th>
              <th className="p-3 text-left">Destination</th>
              <th className="p-3 text-left">Equipment</th>
              <th className="p-3 text-left">Miles</th>
              <th className="p-3 text-left">Comment</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane, i) => (
              <tr key={i} className="border-t border-gray-700">
                <td className="p-3">{lane.originCity}, {lane.originState}</td>
                <td className="p-3">{lane.destinationCity}, {lane.destinationState}</td>
                <td className="p-3">{lane.equipment}</td>
                <td className="p-3">{lane.miles}</td>
                <td className="p-3 text-green-400">{lane.comment || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-4">
        <button className="bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded text-white">
          Export to Excel
        </button>
        <button className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded text-white">
          Export to PDF
        </button>
      </div>
    </div>
  );
}
