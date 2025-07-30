// pages/lanes.js
import { useState } from "react";
import equipmentTypes from "../data/equipmentTypes";
import { generateDATCsv, downloadCsv } from "../lib/datExport";

export default function Lanes() {
  const [lanes, setLanes] = useState([
    {
      originCity: "", originState: "", originZip: "",
      destCity: "", destState: "", destZip: "",
      earliest: "", latest: "", length: "", weight: "",
      equipment: "FD", comment: "", randomize: false
    }
  ]);

  const handleChange = (index, e) => {
    const { name, value, type, checked } = e.target;
    const newLanes = [...lanes];
    newLanes[index][name] = type === "checkbox" ? checked : value;
    setLanes(newLanes);
  };

  const addLane = () => {
    setLanes([
      ...lanes,
      {
        originCity: "", originState: "", originZip: "",
        destCity: "", destState: "", destZip: "",
        earliest: "", latest: "", length: "", weight: "",
        equipment: "FD", comment: "", randomize: false
      }
    ]);
  };

  const removeLane = (index) => {
    setLanes(lanes.filter((_, i) => i !== index));
  };

  const handleExport = () => {
    const csv = generateDATCsv(lanes);
    downloadCsv(csv);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white py-10 px-4">
      <div className="max-w-full overflow-x-auto">
        <h1 className="text-4xl font-bold mb-6 text-cyan-400">Lane Entry</h1>
        <table className="w-full text-sm border-collapse mb-8">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="p-2">Origin City</th>
              <th className="p-2">State</th>
              <th className="p-2">ZIP</th>
              <th className="p-2">Destination City</th>
              <th className="p-2">State</th>
              <th className="p-2">ZIP</th>
              <th className="p-2">Earliest</th>
              <th className="p-2">Latest</th>
              <th className="p-2">Length</th>
              <th className="p-2">Weight</th>
              <th className="p-2">Equipment</th>
              <th className="p-2">Comment</th>
              <th className="p-2">Randomize</th>
              <th className="p-2">Remove</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane, index) => (
              <tr key={index} className="even:bg-gray-900 odd:bg-gray-800">
                {[
                  ["originCity", "text"],
                  ["originState", "text"],
                  ["originZip", "text"],
                  ["destCity", "text"],
                  ["destState", "text"],
                  ["destZip", "text"],
                  ["earliest", "date"],
                  ["latest", "date"],
                  ["length", "number"],
                  ["weight", "number"]
                ].map(([field, type]) => (
                  <td key={field} className="p-2">
                    <input
                      type={type}
                      name={field}
                      value={lane[field]}
                      onChange={(e) => handleChange(index, e)}
                      className="w-full px-2 py-1 bg-gray-700 text-white rounded"
                    />
                  </td>
                ))}
                <td className="p-2">
                  <select
                    name="equipment"
                    value={lane.equipment}
                    onChange={(e) => handleChange(index, e)}
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded"
                  >
                    {equipmentTypes.map((eq) => (
                      <option key={eq.code} value={eq.code}>
                        {eq.code} – {eq.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    name="comment"
                    value={lane.comment}
                    onChange={(e) => handleChange(index, e)}
                    className="w-full px-2 py-1 bg-gray-700 text-white rounded"
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    name="randomize"
                    checked={lane.randomize}
                    onChange={(e) => handleChange(index, e)}
                  />
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => removeLane(index)}
                    className="text-red-400 hover:text-red-600 font-bold"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <button
            onClick={addLane}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-xl font-bold shadow-xl"
          >
            Add Lane
          </button>
          {lanes.length > 0 && (
            <button
              onClick={handleExport}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold shadow-xl"
            >
              Save & Generate DAT CSV
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
