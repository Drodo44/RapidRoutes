// pages/dashboard.js
import { useEffect, useState } from "react";
import supabase from "../utils/supabaseClient";
import Navbar from "../components/Navbar";
import FloorSpaceChecker from "../components/FloorSpaceChecker";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useRouter } from "next/router";

export default function Dashboard() {
  const [lanes, setLanes] = useState([]);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [trend, setTrend] = useState([]);
  const router = useRouter();

  // Fetch lanes & compute stats/trend
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("lanes")
        .select("created_at");
      if (!data) return;

      setLanes(data);
      const now = new Date();
      const todayCount = data.filter((l) =>
        new Date(l.created_at).toDateString() === now.toDateString()
      ).length;
      setStats({ total: data.length, today: todayCount });

      // Build 30-day trend
      const dayMap = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        dayMap[key] = 0;
      }
      data.forEach((l) => {
        const key = new Date(l.created_at).toISOString().split("T")[0];
        if (key in dayMap) dayMap[key]++;
      });
      setTrend(
        Object.entries(dayMap).map(([date, count]) => ({ date, count }))
      );
    };

    // redirect if not authenticated
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) router.replace("/login");
      else fetchData();
    });
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <Navbar />
      <main className="p-6 bg-[#14181F] min-h-screen text-[#E2E8F0] space-y-6">
        <header className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-400 text-white px-4 py-2 rounded"
          >
            Logout
          </button>
        </header>

        {/* Top stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1E222B] p-4 rounded-lg border border-gray-800">
            <p className="text-sm text-gray-300">Current Shipments</p>
            <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="bg-[#1E222B] p-4 rounded-lg border border-gray-800">
            <p className="text-sm text-gray-300">Lanes Added Today</p>
            <p className="mt-2 text-2xl font-semibold">{stats.today}</p>
          </div>
          <div className="bg-[#1E222B] p-4 rounded-lg border border-gray-800">
            <p className="text-sm text-gray-300">Shipment Volume</p>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={trend}>
                <CartesianGrid stroke="#2E323C" strokeDasharray="4 4" />
                <XAxis dataKey="date" hide />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1E222B", border: "none" }}
                  labelStyle={{ color: "#E2E8F0" }}
                  itemStyle={{ color: "#22d3ee" }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4361EE"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tools row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FloorSpaceChecker />
          {/* Placeholder for Oversize Checker or future tools */}
          <div className="bg-[#1E222B] rounded-lg p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white">Oversize Load Checker</h2>
            <p className="text-gray-400 mt-2">Coming soon...</p>
          </div>
        </div>
      </main>
    </>
  );
}
