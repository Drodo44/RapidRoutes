// pages/recap.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import LaneRecapCard from "../components/LaneRecapCard";
import RecapExportButtons from "../components/RecapExportButtons";
import MarketMap from "../components/MarketMap";

export default function Recap() {
  const [lanes, setLanes] = useState([]);
  const [showMap, setShowMap] = useState(false);
  const [fillTo10, setFillTo10] = useState(false);

  useEffect(() => {
    supabase
      .from("lanes")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setLanes(data || []));
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-6 text-gray-100">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Recap</h1>
        <label className="ml-auto flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={showMap} onChange={(e) => setShowMap(e.target.checked)} />
          Show Market Map
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={fillTo10} onChange={(e) => setFillTo10(e.target.checked)} />
          Fill to 10 (allow justified KMA dupes)
        </label>
      </div>

      {showMap && <MarketMap />}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {lanes.map((lane) => (
          <LaneRecapCard key={lane.id} lane={lane} allowFill={fillTo10} />
        ))}
      </div>

      <div className="mt-6">
        <RecapExportButtons />
      </div>
    </main>
  );
}
