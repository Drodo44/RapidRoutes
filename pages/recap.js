import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import TopNav from "../components/TopNav";
import { groupLanesByEquipment } from "../lib/laneUtils";
import { exportRecapWorkbook } from "../utils/recapExport";

export default function Recap() {
  const [lanes, setLanes] = useState([]);
  const [grouped, setGrouped] = useState({});

  useEffect(() => {
    const fetchLanes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("lanes")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (data) {
        setLanes(data);
        setGrouped(groupLanesByEquipment(data));
      }
    };

    fetchLanes();
  }, []);

  const handleExport = async () => {
    await exportRecapWorkbook(lanes);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <TopNav />
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-6">Active Postings Recap</h1>

        <div className="flex justify-end mb-4">
          <button
            onClick={handleExport}
            className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-white font-semibold"
          >
            Export to Excel
          </button>
        </div>

        {Object.entries(grouped).map(([equipment, lanes]) => (
          <div key={equipment} className="mb-8">
            <h2 className="text-2xl font-semibold text-blue-300 mb-2">
              {equipment} ({lanes.length} lanes)
            </h2>
            <div className="bg-gray-900 rounded-xl shadow p-4">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-700">
                    <th className="p-2">Pickup</th>
                    <th className="p-2">Dropoff</th>
                    <th className="p-2">Miles</th>
                    <th className="p-2">Weather</th>
                    <th className="p-2">Strategic Note</th>
                  </tr>
                </thead>
                <tbody>
                  {lanes.map((lane) => (
                    <tr key={lane.id} className="border-t border-gray-800">
                      <td className="p-2">{lane.origin_city}, {lane.origin_state}</td>
                      <td className="p-2">{lane.dest_city}, {lane.dest_state}</td>
                      <td className="p-2 text-gray-300">{lane.distance || "—"}</td>
                      <td className="p-2 text-yellow-400">
                        {lane.weather_flag ? "⚠️ Risk" : "✔️ Clear"}
                      </td>
                      <td className="p-2 text-emerald-300">
                        {lane.selling_point || ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <p className="text-xs text-gray-500 text-center mt-12">
          Created by Andrew Connellan – Logistics Account Exec at TQL, Cincinnati, OH.
        </p>
      </div>
    </main>
  );
}
