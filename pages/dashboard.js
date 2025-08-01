// pages/dashboard.js
import { useEffect, useState } from "react";
import supabase from "../utils/supabaseClient";
import { calculateRRSI } from "../lib/rrsi";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import ProtectedRoute from "../components/ProtectedRoute";

const COLORS = ["#00C49F", "#0088FE", "#FFBB28", "#FF8042"];

function Dashboard() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    const loadLanes = async () => {
      const { data, error } = await supabase.from("lanes").select("*");
      if (!error && data) {
        setLanes(data);
        const entries = data.map((lane) => ({
          id: lane.id,
          message: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`,
          timestamp: lane.created_at || lane.date,
          rrs: lane.rrs,
        }));
        setFeed(entries.reverse().slice(0, 5));
      }
      setLoading(false);
    };

    loadLanes();
  }, []);

  const kpi = {
    active: lanes.length,
    queued: lanes.filter((l) => l.status === "Queued").length,
    rrsAvg:
      lanes.length > 0
        ? Math.round(
            lanes.reduce((acc, l) => acc + (l.rrs || 0), 0) / lanes.length
          )
        : 0,
    equipmentMap: lanes.reduce((acc, lane) => {
      acc[lane.equipment] = (acc[lane.equipment] || 0) + 1;
      return acc;
    }, {}),
  };

  const rrsColor =
    kpi.rrsAvg >= 90 ? "text-green-400" : kpi.rrsAvg >= 75 ? "text-yellow-400" : "text-red-500";

  return (
    <ProtectedRoute>
      <div>
        <h1 className="text-3xl font-bold mb-6 text-cyan-400">Broker Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <KPI title="Active Lanes" value={kpi.active} />
          <KPI title="Queued Lanes" value={kpi.queued} />
          <KPI title="Avg RRSI" value={kpi.rrsAvg} colorClass={rrsColor} />
          <KPI title="Equipment Types" value={Object.keys(kpi.equipmentMap).length} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-[#1a2236] p-4 rounded-2xl shadow-xl">
            <h2 className="text-lg font-semibold mb-2 text-neon-blue">Equipment Mix</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={Object.entries(kpi.equipmentMap).map(([name, value]) => ({ name, value }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name }) => name}
                  outerRadius={80}
                  dataKey="value"
                >
                  {Object.entries(kpi.equipmentMap).map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#1a2236] p-4 rounded-2xl shadow-xl">
            <h2 className="text-lg font-semibold mb-2 text-neon-blue">Recent Activity</h2>
            <ul className="space-y-2">
              {feed.map((entry) => (
                <li key={entry.id} className="text-sm text-gray-300">
                  📦 {entry.message}{" "}
                  <span className="ml-2 text-xs text-gray-500">
                    RRSI: <span className="font-bold">{entry.rrs || "--"}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

function KPI({ title, value, colorClass = "text-white" }) {
  return (
    <div className="bg-[#1a2236] p-6 rounded-2xl shadow-xl">
      <h3 className="text-sm text-gray-400 mb-2">{title}</h3>
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

export default Dashboard;
