import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Recap() {
  const [lanes, setLanes] = useState([]);
  const [insights, setInsights] = useState("");

  useEffect(() => {
    fetchActiveLanes();
    fetchInsights();
    const subscription = supabase
      .channel("lanes")
      .on("postgres_changes", { event: "*", schema: "public", table: "lanes" }, fetchActiveLanes)
      .subscribe();
    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchActiveLanes = async () => {
    const { data } = await supabase.from("lanes").select("*").eq("status", "active");
    setLanes(data || []);
  };

  const fetchInsights = async () => {
    const res = await fetch("/api/ai-recap");
    const data = await res.json();
    setInsights(data.insights || "Market stable, weather clear for most active lanes.");
  };

  const exportHTML = () => {
    const content = `
      <html>
        <head><title>Active Postings</title></head>
        <body style="background:#0a0f1a;color:#fff;">
          <h1>Active Postings</h1>
          <p>${insights}</p>
          <table border="1" cellpadding="5" cellspacing="0" style="color:#fff;border-color:#22d3ee;">
            <thead><tr><th>Origin</th><th>Destination</th><th>Equipment</th><th>Weight</th><th>Dates</th></tr></thead>
            <tbody>
              ${lanes.map(
                (l) =>
                  `<tr><td>${l.origin}</td><td>${l.destination}</td><td>${l.equipment}</td><td>${l.weight}</td><td>${l.earliest} – ${l.latest}</td></tr>`
              ).join("")}
            </tbody>
          </table>
          <footer style="margin-top:20px;font-size:12px;">
            Created by Andrew Connellan – Logistics Account Executive at TQL HQ: Cincinnati, OH
          </footer>
        </body>
      </html>
    `;
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Active_Postings.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-4xl font-bold text-cyan-400 drop-shadow">Active Recap</h1>
      <p className="bg-[#101a2d] p-4 rounded-lg border border-cyan-600/30">{insights}</p>
      <div className="bg-[#141f35] p-6 rounded-lg shadow-cyan-glow">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-cyan-500/30">
              <th>Origin</th>
              <th>Destination</th>
              <th>Equipment</th>
              <th>Weight</th>
              <th>Dates</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane) => (
              <tr key={lane.id} className="border-b border-cyan-500/20">
                <td>{lane.origin}</td>
                <td>{lane.destination}</td>
                <td>{lane.equipment}</td>
                <td>{lane.weight}</td>
                <td>{lane.earliest} – {lane.latest}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={exportHTML}
          className="mt-4 bg-cyan-600 hover:bg-cyan-500 px-6 py-3 rounded-lg font-semibold"
        >
          Export Active Postings (HTML)
        </button>
      </div>
    </div>
  );
}
