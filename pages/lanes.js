// pages/lanes.js
import { useState } from "react";
import { generateDATCsv, downloadCsv } from "../lib/datExport";

export default function Lanes() {
  const [lanes, setLanes] = useState([]);
  const [form, setForm] = useState({
    originCity: "", originState: "", originZip: "",
    destCity: "", destState: "", destZip: "",
    equipment: "", weight: "", length: "", earliest: "", latest: "",
    comment: "", randomize: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleAddLane = (e) => {
    e.preventDefault();
    setLanes([...lanes, form]);
    setForm({
      originCity: "", originState: "", originZip: "",
      destCity: "", destState: "", destZip: "",
      equipment: "", weight: "", length: "", earliest: "", latest: "",
      comment: "", randomize: false
    });
  };

  const handleExport = () => {
    const csv = generateDATCsv(lanes);
    downloadCsv(csv);
  };

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col items-center py-12 text-white">
      <form
        onSubmit={handleAddLane}
        className="bg-[#1a2236] p-8 rounded-2xl shadow-2xl max-w-xl w-full"
      >
        <h1 className="text-3xl font-bold mb-6 text-neon-blue">Create New Lane</h1>

        {[
          ["Origin City", "originCity"], ["Origin State", "originState"], ["Origin ZIP", "originZip"],
          ["Destination City", "destCity"], ["Destination State", "destState"], ["Destination ZIP", "destZip"],
          ["Earliest Pickup Date", "earliest", "date"], ["Latest Pickup Date", "latest", "date"],
          ["Length (ft)", "length"], ["Weight (lbs)", "weight"],
          ["Equipment Type", "equipment"], ["Comment (Optional)", "comment"]
        ].map(([label, name, type = "text"]) => (
          <div key={name} className="mb-4">
            <label className="block mb-1">{label}</label>
            <input
              type={type}
              name={name}
              required={name !== "comment"}
              value={form[name]}
              onChange={handleChange}
              className="w-full p-2 rounded bg-[#222f45] border border-gray-700"
            />
          </div>
        ))}

        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            name="randomize"
            checked={form.randomize}
            onChange={handleChange}
            className="mr-2"
          />
          <label>Randomize Weight (DAT-optimized)</label>
        </div>

        <button type="submit" className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-xl font-bold shadow-xl mt-2">
          Add Lane
        </button>
      </form>

      {lanes.length > 0 && (
        <button
          onClick={handleExport}
          className="mt-6 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl font-bold shadow-xl"
        >
          Save & Generate DAT CSV
        </button>
      )}
    </div>
  );
}
