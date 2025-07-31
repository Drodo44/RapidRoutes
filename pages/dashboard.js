// pages/dashboard.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Dashboard() {
  const [lanes, setLanes] = useState([]);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    setUserRole(profile?.role || "Apprentice");

    const { data: lanesData } = await supabase
      .from("lane_versions")
      .select("*")
      .order("created_at", { ascending: false });

    setLanes(lanesData || []);
    setLoading(false);
  };

  const kpi = {
    total: lanes.length,
    hazmat: lanes.filter(l => l.comment?.toLowerCase().includes("hazmat")).length,
    intermodal: lanes.filter(l => l.intermodal).length,
    avg_rrsi: lanes.length ? Math.round(
      lanes.reduce((acc, l) => {
        let score = 100;
        if (l.comment?.toLowerCase().includes("hazmat")) score -= 7;
        if (l.intermodal) score += 3;
        return acc + score;
      }, 0) / lanes.length
    ) : 0
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-8">Dashboard</h1>

        {loading ? (
          <p>Loading lanes...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <KpiCard label="Total Lanes" value={kpi.total} />
            <KpiCard label="Hazmat Lanes" value={kpi.hazmat} />
            <KpiCard label="Intermodal Lanes" value={kpi.intermodal} />
            <KpiCard label="Avg RRSI" value={kpi.avg_rrsi} />
          </div>
        )}

        {userRole === "Admin" && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-cyan-300 mb-2">Recent Lane Activity</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-cyan-300 border-b border-gray-600">
                    <th className="p-2 text-left">Origin ➝ Dest</th>
                    <th className="p-2 text-left">Created</th>
                    <th className="p-2 text-left">User</th>
                    <th className="p-2">Intermodal</th>
                    <th className="p-2">Hazmat</th>
                  </tr>
                </thead>
                <tbody>
                  {lanes.slice(0, 10).map((lane, i) => (
                    <tr key={i} className="even:bg-[#1a2437] odd:bg-[#202b42] border-b border-gray-700">
                      <td className="p-2">
                        {lane.original_origin_city} ➝ {lane.original_dest_city}
                      </td>
                      <td className="p-2">{lane.created_at?.slice(0, 10)}</td>
                      <td className="p-2">{lane.created_by || "–"}</td>
                      <td className="p-2 text-center">{lane.intermodal ? "✅" : ""}</td>
                      <td className="p-2 text-center">
                        {lane.comment?.toLowerCase().includes("hazmat") ? "⚠️" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="bg-[#1e293b] border border-cyan-800 rounded-xl shadow p-4 text-center">
      <div className="text-xl font-bold text-neon-green">{value}</div>
      <div className="text-sm text-gray-300">{label}</div>
    </div>
  );
}
