// pages/dashboard.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import dynamic from "next/dynamic";

// Dynamic import for charts (client-side only)
const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } =
  dynamic(() => import("recharts"), { ssr: false });

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("");
  const [kpis, setKpis] = useState({});
  const [activityFeed, setActivityFeed] = useState([]);
  const [aiTip, setAiTip] = useState("");

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) fetchProfile(user.id);
    };
    getUser();
  }, []);

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    setRole(data?.role || "Broker");
    fetchKpis(userId);
    fetchActivity();
    fetchAiTip();
  };

  const fetchKpis = async (userId) => {
    const { data } = await supabase.rpc("fetch_dashboard_kpis", { user_id: userId });
    setKpis(data || {});
  };

  const fetchActivity = async () => {
    const { data } = await supabase
      .from("activity_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    setActivityFeed(data || []);
  };

  const fetchAiTip = async () => {
    const res = await fetch("/api/ai-tip");
    const data = await res.json();
    setAiTip(data.tip || "Stay proactive with DAT postings during morning peaks!");
  };

  return (
    <div className="p-8 flex flex-col space-y-8">
      <h1 className="text-4xl font-bold text-cyan-400 mb-4 drop-shadow">
        Dashboard
      </h1>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#141f35] rounded-lg p-6 shadow-cyan-glow text-center">
          <p className="text-sm opacity-70">Active Lanes</p>
          <p className="text-3xl font-bold">{kpis.active_lanes || 0}</p>
        </div>
        <div className="bg-[#141f35] rounded-lg p-6 shadow-cyan-glow text-center">
          <p className="text-sm opacity-70">Loads Covered</p>
          <p className="text-3xl font-bold">{kpis.loads_covered || 0}</p>
        </div>
        <div className="bg-[#141f35] rounded-lg p-6 shadow-cyan-glow text-center">
          <p className="text-sm opacity-70">Revenue ($)</p>
          <p className="text-3xl font-bold">{kpis.revenue || 0}</p>
        </div>
        <div className="bg-[#141f35] rounded-lg p-6 shadow-cyan-glow text-center">
          <p className="text-sm opacity-70">RRSI Score</p>
          <p className="text-3xl font-bold">{kpis.rrsi || 0}</p>
        </div>
      </div>

      {/* AI Tip */}
      <div className="bg-[#101a2d] rounded-lg p-6 shadow-md border border-cyan-600/30">
        <h2 className="text-xl font-semibold text-cyan-300 mb-2">
          AI Strategy Tip
        </h2>
        <p>{aiTip}</p>
      </div>

      {/* Activity Feed */}
      <div className="bg-[#141f35] rounded-lg p-6 shadow-cyan-glow">
        <h2 className="text-xl font-semibold text-cyan-300 mb-4">Recent Activity</h2>
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {activityFeed.map((item, idx) => (
            <li key={idx} className="text-sm">
              {item.message} –{" "}
              <span className="opacity-70">
                {new Date(item.created_at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Lane Performance Chart (sample) */}
      <div className="bg-[#141f35] rounded-lg p-6 shadow-cyan-glow">
        <h2 className="text-xl font-semibold text-cyan-300 mb-4">
          Lane Performance Trends
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kpis.lane_trends || []}>
              <XAxis dataKey="date" stroke="#22d3ee" />
              <YAxis stroke="#22d3ee" />
              <Tooltip />
              <Line type="monotone" dataKey="loads" stroke="#06b6d4" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
