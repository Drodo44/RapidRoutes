// pages/recap.js
import { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { getSellingPoint } from "../lib/sellingPoints";
import { getLaneRiskTag } from "../lib/weatherUtils";
import RecapExportButtons from "../components/RecapExportButtons";

export default function Recap() {
  // Pull lanes from Supabase; fall back to empty array until loaded
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchLanes = async () => {
      // Select only active lanes; adjust as needed for your schema
      const { data, error } = await supabase
        .from("lanes")
        .select("id, origin, destination, equipment, weight")
        .order("id", { ascending: true });
      if (!error && data) {
        // Enrich each lane with selling points and risk tags.  Weather overlays
        // could be added here by calling an external API or supabase function.
        const enriched = data.map((lane) => {
          const sellingPoint = getSellingPoint(
            lane.origin || "",
            lane.destination || "",
            lane.equipment || ""
          );
          const riskTag = getLaneRiskTag({
            origin_state: lane.origin?.split(",")[1]?.trim(),
            dest_state: lane.destination?.split(",")[1]?.trim(),
            weight: lane.weight || 0,
          });
          return {
            ...lane,
            sellingPoint,
            risk: riskTag?.label || "Low",
            riskNote: riskTag?.note || "",
          };
        });
        setLanes(enriched);
      }
      setLoading(false);
    };
    fetchLanes();
  }, []);

  const scrollToLane = (id) => {
    const el = document.getElementById(`lane-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="min-h-screen bg-[#0b1623] py-10 px-4 text-white">
      <div className="max-w-7xl mx-auto bg-[#151d2b] rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-cyan-400">Active Postings Recap</h1>
          {/* Jump‑to select scrolls to the lane row */}
          <select
            onChange={(e) => scrollToLane(Number(e.target.value))}
            className="bg-gray-800 text-white p-2 rounded-xl"
          >
            <option value="">Jump to Lane</option>
            {lanes.map((lane) => (
              <option key={lane.id} value={lane.id}>
                {lane.origin} → {lane.destination}
              </option>
            ))}
          </select>
        </div>
        {/* Export button to HTML recap */}
        <RecapExportButtons />
        {loading ? (
          <div className="text-cyan-400 text-center">Loading lanes…</div>
        ) : (
          <div id="recap-root" className="overflow-x-auto">
            <table className="w-full border-collapse text-white">
              <thead>
                <tr className="bg-[#233056] text-cyan-400">
                  <th className="p-3">Origin</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Equipment</th>
                  <th className="p-3">Weight</th>
                  <th className="p-3">Risk</th>
                  <th className="p-3">Selling Points</th>
                </tr>
              </thead>
              <tbody>
                {lanes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center">
                      No lanes to display
                    </td>
                  </tr>
                ) : (
                  lanes.map((lane) => (
                    <tr
                      key={lane.id}
                      id={`lane-${lane.id}`}
                      className="even:bg-[#1a2437] odd:bg-[#202b42] border-b border-gray-800"
                    >
                      <td className="p-3">{lane.origin}</td>
                      <td className="p-3">{lane.destination}</td>
                      <td className="p-3">{lane.equipment}</td>
                      <td className="p-3">{lane.weight}</td>
                      <td className="p-3">
                        <span
                          className={`font-semibold ${
                            lane.risk === "⚠ Weather Risk" || lane.risk === "⚠ Overweight"
                              ? "text-yellow-400"
                              : "text-green-400"
                          }`}
                          title={lane.riskNote || ""}
                        >
                          {lane.risk}
                        </span>
                      </td>
                      <td className="p-3 text-white font-medium">
                        {lane.sellingPoint || ""}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
