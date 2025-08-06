import RecapExportButtons from "../components/RecapExportButtons";import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import supabase from "../utils/supabaseClient";

export default function Recap() {
  const [lanes, setLanes] = useState([]);

  useEffect(() => {
    const fetchLanes = async () => {
      const { data, error } = await supabase.from("lanes").select("*").order("date", { ascending: false });
      if (error) console.error("Failed to fetch lanes:", error);
      else setLanes(data || []);
    };

    fetchLanes();
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-950 text-white px-4 py-10">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-cyan-400 text-center mb-8">Active Postings Recap</h1>
<RecapExportButtons lanes={lanes} />
          <div className="overflow-x-auto">
            <table className="w-full table-auto bg-[#1a2236] rounded-xl overflow-hidden shadow-lg text-sm">
              <thead className="bg-blue-900 text-white">
                <tr>
                  <th className="px-4 py-2">Origin</th>
                  <th className="px-4 py-2">Destination</th>
                  <th className="px-4 py-2">Equipment</th>
                  <th className="px-4 py-2">Weight</th>
                  <th className="px-4 py-2">Length</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Comment</th>
                </tr>
              </thead>
              <tbody>
                {lanes.map((lane) => (
                  <tr key={lane.id} className="text-white even:bg-gray-800 odd:bg-gray-700">
                    <td className="px-4 py-2">{lane.originCity}, {lane.originState}</td>
                    <td className="px-4 py-2">{lane.destCity}, {lane.destState}</td>
                    <td className="px-4 py-2">{lane.equipment}</td>
                    <td className="px-4 py-2">{lane.weight}</td>
                    <td className="px-4 py-2">{lane.length}</td>
                    <td className="px-4 py-2">{lane.date}</td>
                    <td className="px-4 py-2">{lane.comment}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="text-sm text-gray-400 text-center mt-10">
            Created by Andrew Connellan – Logistics Account Executive at Total Quality Logistics HQ: Cincinnati, OH
          </footer>
        </div>
      </main>
    </>
  );
}
