// pages/preview.js
import { useEffect, useState } from "react";
import { fetchLaneRecords } from "../services/laneService.js";
import { generateDatCsvRows } from "../lib/exportDatCsv";

export default function Preview() {
  const [lanes, setLanes] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const records = await fetchLaneRecords({ status: "all", includeArchived: true, limit: 500 });
        setLanes(records);
        const rows = generateDatCsvRows(records);
        setPreviewRows(rows.slice(1)); // skip headers
      } catch (error) {
        console.error("Failed to load lanes for preview:", error);
      }
      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b1623] text-white py-10 px-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-6">DAT Posting Preview</h1>

      {loading ? (
        <p className="text-blue-400">Loading lanes...</p>
      ) : (
        <div className="overflow-x-auto text-sm">
          <table className="w-full bg-[#151d2b] rounded-xl shadow-2xl">
            <thead className="text-neon-blue bg-[#233056]">
              <tr>
                <th className="p-2">Earliest</th>
                <th className="p-2">Length</th>
                <th className="p-2">Weight</th>
                <th className="p-2">Equip</th>
                <th className="p-2">Origin</th>
                <th className="p-2">Dest</th>
                <th className="p-2">Contact</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? "bg-[#202b42]" : "bg-[#1a2437]"}
                >
                  <td className="p-2">{row[0]}</td>
                  <td className="p-2">{row[2]}</td>
                  <td className="p-2">{row[3]}</td>
                  <td className="p-2">{row[5]}</td>
                  <td className="p-2">{row[15]}, {row[16]}</td>
                  <td className="p-2">{row[18]}, {row[19]}</td>
                  <td className="p-2">{row[14]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
