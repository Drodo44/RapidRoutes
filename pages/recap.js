import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Recap() {
  const [lanes, setLanes] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase.from("lanes").select("*").order("created_at", { ascending: false });
      if (!error && data) setLanes(data);
    };
    fetch();
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">Recap</h1>
      {lanes.length === 0 ? (
        <p>No lanes yet.</p>
      ) : (
        lanes.map((lane, idx) => (
          <div key={idx} className="bg-gray-900 rounded-lg p-4 mb-4 shadow">
            <h2 className="text-xl font-semibold">
              {lane.origin} ➝ {lane.destination}
            </h2>
            <p className="text-sm text-gray-400">Equipment: {lane.equipment} | {lane.length}ft</p>
            <p className="text-sm">Pickup: {lane.dateEarliest} | Weight: {lane.randomizeWeight ? `${lane.randomLow}-${lane.randomHigh} lbs` : `${lane.baseWeight} lbs`}</p>
            <p className="text-sm mt-2 text-green-400">{lane.note || "No notes yet"}</p>
          </div>
        ))
      )}
    </main>
  );
}
