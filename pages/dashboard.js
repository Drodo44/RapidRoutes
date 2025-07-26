import { useEffect, useState } from 'react';
import supabase from '../utils/supabaseClient';

export default function Dashboard() {
  const [activeLanes, setActiveLanes] = useState(0);
  const [archivedLanes, setArchivedLanes] = useState(0);
  const [avgTimeToCover, setAvgTimeToCover] = useState(0);
  const [topMarkets, setTopMarkets] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const { count: activeCount } = await supabase
      .from('lanes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active');
    const { count: archivedCount } = await supabase
      .from('lanes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Archived');
    setActiveLanes(activeCount || 0);
    setArchivedLanes(archivedCount || 0);

    const { data: archived } = await supabase
      .from('lanes')
      .select('created_at, updated_at')
      .eq('status', 'Archived')
      .limit(50);
    if (archived && archived.length > 0) {
      const total = archived.reduce((sum, lane) => {
        const start = new Date(lane.created_at).getTime();
        const end = new Date(lane.updated_at || lane.created_at).getTime();
        return sum + (end - start);
      }, 0);
      setAvgTimeToCover(Math.round(total / archived.length / 3600000));
    }

    const { data: markets } = await supabase
      .from('lanes')
      .select('origin_kma_name')
      .eq('status', 'Active');
    if (markets) {
      const counts = {};
      markets.forEach((m) => {
        if (!m.origin_kma_name) return;
        counts[m.origin_kma_name] = (counts[m.origin_kma_name] || 0) + 1;
      });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      setTopMarkets(sorted);
    }

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('lanes')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);
    if (recent) setActivityFeed(recent);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-6 text-cyan-400">RapidRoutes Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 p-4 rounded-2xl shadow-lg">
          <p className="text-gray-400">Active Lanes</p>
          <h2 className="text-2xl text-emerald-400">{activeLanes}</h2>
        </div>
        <div className="bg-gray-900 p-4 rounded-2xl shadow-lg">
          <p className="text-gray-400">Archived Lanes</p>
          <h2 className="text-2xl text-emerald-400">{archivedLanes}</h2>
        </div>
        <div className="bg-gray-900 p-4 rounded-2xl shadow-lg">
          <p className="text-gray-400">Avg Time to Cover</p>
          <h2 className="text-2xl text-emerald-400">{avgTimeToCover} hrs</h2>
        </div>
        <div className="bg-gray-900 p-4 rounded-2xl shadow-lg">
          <p className="text-gray-400">Top Markets</p>
          {topMarkets.map(([m, count]) => (
            <p key={m} className="text-emerald-300">{m}: {count}</p>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 p-4 rounded-2xl shadow-lg">
        <h2 className="text-xl text-cyan-400 mb-4">Recent Activity (24h)</h2>
        {activityFeed.length === 0 ? (
          <p className="text-gray-500">No recent activity</p>
        ) : (
          <ul>
            {activityFeed.map((lane) => (
              <li key={lane.id} className="mb-2 text-gray-300">
                {lane.origin_city}, {lane.origin_state} → {lane.dest_city}, {lane.dest_state} |{' '}
                {lane.equipment} | {new Date(lane.created_at).toLocaleTimeString()}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex space-x-4 mt-8">
        <a href="/lanes" className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl shadow-lg">Go to Lanes</a>
        <a href="/recap" className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-xl shadow-lg">Active Postings</a>
        <a href="/api/exportDatCsv" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-xl shadow-lg">Export DAT CSV</a>
      </div>
    </main>
  );
}
