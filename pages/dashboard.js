import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { getFloorSpaceInfo } from "../lib/floorCalculator";
import { getHeatColor } from "../lib/weatherUtils";
import TopNav from "../components/TopNav";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [metrics, setMetrics] = useState({
    lanesPosted: 0,
    avgRRSI: 0,
    carriersEngaged: 0,
  });
  const [calc, setCalc] = useState({ pallets: "", length: 0, result: "" });

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) return;
      setUser(data.user);

      const { data: lanes } = await supabase
        .from("lanes")
        .select("*")
        .eq("created_by", data.user.id);

      const total = lanes?.length || 0;
      const avgRRSI =
        lanes?.reduce((sum, l) => sum + (l.rrs || 50), 0) / total || 0;
      const carriers = new Set(lanes?.flatMap((l) => l.carriers || [])).size;

      setMetrics({
        lanesPosted: total,
        avgRRSI: Math.round(avgRRSI),
        carriersEngaged: carriers,
      });
    };

    getUser();
  }, []);

  const handleCalc = () => {
    const { pallets, length } = calc;
    const res = getFloorSpaceInfo(parseInt(pallets), parseFloat(length));
    setCalc((prev) => ({ ...prev, result: res }));
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white px-6 py-8">
      <TopNav />
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-4">
          Dashboard Overview
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-gray-900 rounded-xl p-6 shadow">
            <h2 className="text-xl font-semibold mb-2">Lanes Posted</h2>
            <p className="text-3xl">{metrics.lanesPosted}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 shadow">
            <h2 className="text-xl font-semibold mb-2">Avg. RRSI</h2>
            <p className={`text-3xl ${getHeatColor(metrics.avgRRSI)}`}>
              {metrics.avgRRSI}
            </p>
          </div>
          <div className="bg-gray-900 rounded-xl p-6 shadow">
            <h2 className="text-xl font-semibold mb-2">Carriers Engaged</h2>
            <p className="text-3xl">{metrics.carriersEngaged}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* AI Freight Intel */}
          <div className="lg:col-span-2 bg-gray-900 rounded-xl p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-emerald-400">
              📡 Freight Intelligence Feed
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-300">
              <li>📈 Midwest flatbed demand up 12% over 7 days</li>
              <li>⚠️ CO & WY lanes flagged for possible weather disruptions</li>
              <li>🚨 18% increase in carrier bid volatility on reefer lanes</li>
              <li>💡 Strong reload potential around Dallas, TX this week</li>
            </ul>
          </div>

          {/* Floor Calculator */}
          <div className="bg-gray-900 rounded-xl p-6 shadow">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">
              📦 Floor Space Calculator
            </h2>
            <div className="space-y-4">
              <input
                type="number"
                placeholder="Number of Pallets"
                className="w-full p-2 rounded bg-gray-800 text-white"
                value={calc.pallets}
                onChange={(e) =>
                  setCalc((prev) => ({ ...prev, pallets: e.target.value }))
                }
              />
              <input
                type="number"
                placeholder="Length per Pallet (ft)"
                className="w-full p-2 rounded bg-gray-800 text-white"
                value={calc.length}
                onChange={(e) =>
                  setCalc((prev) => ({ ...prev, length: e.target.value }))
                }
              />
              <button
                onClick={handleCalc}
                className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-semibold"
              >
                Calculate Fit
              </button>
              {calc.result && (
                <p className="text-emerald-300 mt-2">{calc.result}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
