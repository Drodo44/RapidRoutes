import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Recap() {
  const [lanes, setLanes] = useState([]);

  useEffect(() => {
    fetchLanes();
  }, []);

  async function fetchLanes() {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.data?.session?.user?.id;
    if (!userId) return;

    const { data } = await supabase
      .from("lanes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setLanes(data || []);
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl text-cyan-400 font-bold mb-6">Recap</h1>

      {lanes.map((lane, idx) => (
        <div
          key={idx}
          className="bg-gray-800 mb-6 p-4 rounded-xl shadow-lg border border-cyan-900"
        >
          <h2 className="text-xl text-white font-semibold mb-2">
            {lane.pickupCity}, {lane.pickupState} ➞ {lane.deliveryCity}, {lane.deliveryState}
          </h2>

          <p className="text-gray-300">
            Equipment: <span className="font-medium">{lane.equipment}</span>
          </p>
          <p className="text-gray-300">
            Miles to Pickup: <span className="font-medium">{lane.pickupMiles || "N/A"}</span>
          </p>
          <p className="text-gray-300">
            Miles to Delivery: <span className="font-medium">{lane.deliveryMiles || "N/A"}</span>
          </p>

          {lane.sellingPoint && (
            <p className="mt-2 text-emerald-400 font-medium italic">
              Selling Point: {lane.sellingPoint}
            </p>
          )}

          {lane.weather && (
            <p className="mt-1 text-blue-300">
              Weather Alert: <span className="italic">{lane.weather}</span>
            </p>
          )}
        </div>
      ))}
    </main>
  );
}
