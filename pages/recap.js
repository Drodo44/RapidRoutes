import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Image from "next/image";
import logo from "../public/logo.png";

export default function Recap() {
  const [lanes, setLanes] = useState([]);

  useEffect(() => {
    const fetchLanes = async () => {
      const { data, error } = await supabase.from("lanes").select("*");
      if (!error) setLanes(data);
    };
    fetchLanes();
  }, []);

  return (
    <main className="min-h-screen bg-[#0f1117] text-white p-6">
      <div className="flex items-center mb-8">
        <Image src={logo} alt="RapidRoutes Logo" width={40} height={40} />
        <h1 className="text-2xl font-bold ml-4">Active Postings Recap</h1>
      </div>

      {lanes.length === 0 ? (
        <p className="text-gray-400">No lanes to display.</p>
      ) : (
        <div className="space-y-8">
          {lanes.map((lane) => (
            <div
              key={lane.id}
              className="border border-gray-800 rounded-md shadow-sm p-4 bg-[#1b1d25]"
            >
              <div className="text-xl font-semibold text-cyan-400">
                {lane.origin_city}, {lane.origin_state} → {lane.destination_city},{" "}
                {lane.destination_state}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-sm">
                <div>
                  <strong>Equipment:</strong> {lane.equipment}
                </div>
                <div>
                  <strong>Weight:</strong>{" "}
                  {lane.randomize_weight
                    ? `${lane.random_min_weight}–${lane.random_max_weight} lbs (random)`
                    : `${lane.weight} lbs`}
                </div>
                <div>
                  <strong>Length:</strong> {lane.length} ft
                </div>
                <div>
                  <strong>Pickup:</strong> {lane.pickup_earliest} –{" "}
                  {lane.pickup_latest}
                </div>
                <div>
                  <strong>Rate:</strong> {lane.rate ? `$${lane.rate}` : "—"}
                </div>
                <div>
                  <strong>Comment:</strong> {lane.comment || "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="text-gray-600 text-xs mt-12 border-t border-gray-700 pt-4">
        Created by Andrew Connellan – Logistics Account Executive at Total
        Quality Logistics HQ: Cincinnati, OH
      </footer>
    </main>
  );
}
