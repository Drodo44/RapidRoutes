// pages/recap.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import Image from "next/image";
import { shouldSuggestReefer } from "../utils/reeferAdvisor";
import { getSellingPoint } from "../utils/sellingPoints";

export default function Recap() {
  const [groupedLanes, setGroupedLanes] = useState([]);

  useEffect(() => {
    fetchGroupedLanes();
  }, []);

  const fetchGroupedLanes = async () => {
    const { data, error } = await supabase
      .from("lane_versions")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading lanes:", error.message);
      return;
    }

    const grouped = {};

    for (const row of data) {
      const key = `${row.original_origin_city}→${row.original_dest_city}`;
      if (!grouped[key]) {
        grouped[key] = {
          origin: row.original_origin_city,
          dest: row.original_dest_city,
          crawls: [],
          metadata: {
            equipment: row.equipment,
            intermodal: row.intermodal,
            hazmat: row.comment?.toLowerCase().includes("hazmat"),
            comment: row.comment || "",
            earliest: row.earliest,
            latest: row.latest,
          },
        };
      }
      grouped[key].crawls.push(row);
    }

    setGroupedLanes(Object.values(grouped));
  };

  return (
    <div className="min-h-screen bg-[#0b1623] text-white px-6 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Image src="/logo.png" width={40} height={40} alt="RapidRoutes" />
          <h1 className="text-3xl font-bold text-cyan-400">Recap</h1>
        </div>

        {groupedLanes.map((group, i) => {
          const flags = [];
          if (group.metadata.hazmat) flags.push("HAZMAT");
          if (group.metadata.intermodal) flags.push("INTERMODAL");
          if (shouldSuggestReefer(group.metadata).show) flags.push("REEFER?");

          const sellingPoint = getSellingPoint(group.origin, group.dest, group.metadata);

          return (
            <div
              key={i}
              className="mb-10 border border-cyan-700 rounded-xl p-6 bg-[#151d2b] shadow-md"
            >
              <h2 className="text-xl font-bold text-neon-blue mb-2">
                {group.origin} ➝ {group.dest}
              </h2>

              {flags.length > 0 && (
                <div className="text-sm text-yellow-300 italic mb-2">
                  {flags.join(" • ")}
                </div>
              )}

              {sellingPoint && (
                <div className="text-sm text-green-400 font-medium mb-4">
                  🧠 {sellingPoint}
                </div>
              )}

              <table className="w-full text-sm text-left mt-2">
                <thead>
                  <tr className="text-cyan-300 border-b border-gray-600">
                    <th className="p-2">Pickup City</th>
                    <th className="p-2">Miles from Origin</th>
                    <th className="p-2">Delivery City</th>
                    <th className="p-2">Miles from Destination</th>
                  </tr>
                </thead>
                <tbody>
                  {group.crawls.map((row, j) => (
                    <tr
                      key={j}
                      className="even:bg-[#1a2437] odd:bg-[#202b42] border-b border-gray-700"
                    >
                      <td className="p-2">
                        {row.pickup_city}, {row.pickup_state}
                      </td>
                      <td className="p-2">{row.miles_from_origin} mi</td>
                      <td className="p-2">
                        {row.delivery_city}, {row.delivery_state}
                      </td>
                      <td className="p-2">{row.miles_from_dest} mi</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        <footer className="mt-12 text-center text-xs text-gray-400 italic">
          Created by Andrew Connellan – Logistics Account Executive at TQL HQ: Cincinnati, OH
        </footer>
      </div>
    </div>
  );
}
