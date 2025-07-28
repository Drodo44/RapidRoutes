// /pages/recap.js
import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

export default function Recap() {
  const [lanes, setLanes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLanes = async () => {
      const { data, error } = await supabase.from("lanes").select("*");
      if (!error) setLanes(data || []);
      setLoading(false);
    };
    fetchLanes();
  }, []);

  const handleDownload = () => {
    const html = document.getElementById("recap-report").outerHTML;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Active_Postings_Recap.html";
    a.click();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white py-10 px-4">
      <div id="recap-report" className="max-w-6xl mx-auto bg-gray-900 rounded-2xl shadow-2xl p-6">
        <h1 className="text-4xl font-bold text-cyan-400 mb-8">Active Postings Recap</h1>
        {loading ? (
          <p className="text-blue-400">Loading lanes...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-800 text-cyan-400">
                  <th className="p-3">Origin</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Equipment</th>
                  <th className="p-3">Weight</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Length</th>
                  <th className="p-3">RRSI</th>
                  <th className="p-3">Comment</th>
                </tr>
              </thead>
              <tbody>
                {lanes.map((lane) => (
                  <tr key={lane.id} className="even:bg-gray-800 odd:bg-gray-700">
                    <td className="p-3">{lane.origin_city}, {lane.origin_state}</td>
                    <td className="p-3">{lane.dest_city}, {lane.dest_state}</td>
                    <td className="p-3">{lane.equipment}</td>
                    <td className="p-3">{lane.weight}</td>
                    <td className="p-3">{lane.date}</td>
                    <td className="p-3">{lane.length}</td>
                    <td className="p-3 text-green-400 font-bold">{lane.rrsi || 90}</td>
                    <td className="p-3">{lane.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="max-w-6xl mx-auto mt-6 text-center">
        <button onClick={handleDownload}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
          Download Recap (HTML)
        </button>
      </div>
    </div>
  );
}
