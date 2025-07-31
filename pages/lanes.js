import { useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { generateDATCSV } from "../lib/datExport";
import equipmentTypes from "../data/equipmentTypes";
import { saveAs } from "file-saver";

export default function Lanes() {
  const [lanes, setLanes] = useState([]);
  const [userId, setUserId] = useState(null);
  const [weightRange, setWeightRange] = useState({ min: 46750, max: 48000 });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data?.session?.user;
      if (user) setUserId(user.id);
    });
  }, []);

  const handleAddLane = () => {
    setLanes([
      ...lanes,
      {
        pickupCity: "",
        pickupState: "",
        pickupZip: "",
        deliveryCity: "",
        deliveryState: "",
        deliveryZip: "",
        earliestDate: "",
        latestDate: "",
        length: "48",
        weightMin: "",
        weightMax: "",
        equipment: "",
        comment: "",
        contactMethods: ["Email", "Primary Phone"],
        randomize: false,
      },
    ]);
  };

  const handleRemoveLane = (index) => {
    const updated = [...lanes];
    updated.splice(index, 1);
    setLanes(updated);
  };

  const handleChange = (index, field, value) => {
    const updated = [...lanes];
    updated[index][field] = value;
    setLanes(updated);
  };

  const handleRandomizeToggle = (index) => {
    const updated = [...lanes];
    updated[index].randomize = !updated[index].randomize;
    updated[index].weightMin = weightRange.min;
    updated[index].weightMax = weightRange.max;
    setLanes(updated);
  };

  const handleGenerate = async () => {
    if (!userId) return alert("User not authenticated.");

    const records = lanes.map((lane) => ({
      ...lane,
      user_id: userId,
      created_at: new Date().toISOString(),
    }));

    await supabase.from("lanes").insert(records);

    const csv = generateDATCSV(lanes);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `DAT_Postings_${Date.now()}.csv`);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold text-cyan-400 mb-4">Lane Entry</h1>

      {lanes.map((lane, idx) => (
        <div
          key={idx}
          className="border border-cyan-800 rounded-lg p-4 mb-4 bg-gray-900 shadow-md"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="Pickup City"
              value={lane.pickupCity}
              onChange={(e) => handleChange(idx, "pickupCity", e.target.value)}
              className="p-2 bg-gray-800 rounded"
            />
            <input
              type="text"
              placeholder="Pickup State"
              value={lane.pickupState}
              onChange={(e) => handleChange(idx, "pickupState", e.target.value)}
              className="p-2 bg-gray-800 rounded"
            />
            <input
              type="text"
              placeholder="Pickup ZIP (optional)"
              value={lane.pickupZip}
              onChange={(e) => handleChange(idx, "pickupZip", e.target.value)}
              className="p-2 bg-gray-800 rounded"
            />
            <input
              type="text"
              placeholder="Delivery City"
              value={lane.deliveryCity}
              onChange={(e) => handleChange(idx, "deliveryCity", e.target.value)}
              className="p-2 bg-gray-800 rounded"
            />
            <input
              type="text"
              placeholder="Delivery State"
              value={lane.deliveryState}
              onChange={(e) => handleChange(idx, "deliveryState", e.target.value)}
              className="p-2 bg-gray-800 rounded"
            />
            <input
              type="text"
              placeholder="Delivery ZIP (optional)"
              value={lane.deliveryZip}
              onChange={(e) => handleChange(idx, "deliveryZip", e.target.value)}
              className="p-2 bg-gray-800 rounded"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="date"
              value={lane.earliestDate}
              onChange={(e) => handleChange(idx, "earliestDate", e.target.value)}
              className="p-2 bg-gray-800 rounded"
            />
            <input
              type="date"
              value={lane.latestDate}
              onChange={(e) => handleChange(idx, "latestDate", e.target.value)}
              className="p-2 bg-gray-800 rounded"
            />
            <input
              type="number"
              placeholder="Length (ft)"
              value={lane.length}
              onChange={(e) => handleChange(idx, "length", e.target.value)}
              className="p-2 bg-gray-800 rounded"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="number"
              placeholder="Weight Min"
              value={lane.weightMin}
              onChange={(e) => handleChange(idx, "weightMin", e.target.value)}
              disabled={lane.randomize}
              className="p-2 bg-gray-800 rounded"
            />
            <input
              type="number"
              placeholder="Weight Max"
              value={lane.weightMax}
              onChange={(e) => handleChange(idx, "weightMax", e.target.value)}
              disabled={lane.randomize}
              className="p-2 bg-gray-800 rounded"
            />
            <select
              value={lane.equipment}
              onChange={(e) => handleChange(idx, "equipment", e.target.value)}
              className="p-2 bg-gray-800 rounded"
            >
              <option value="">Select Equipment</option>
              {equipmentTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.code} – {type.description}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={lane.randomize}
                onChange={() => handleRandomizeToggle(idx)}
              />
              Randomize Weight
            </label>
            {lane.randomize && (
              <span className="text-sm text-gray-400">
                Using global range: {weightRange.min} – {weightRange.max}
              </span>
            )}
            <input
              type="text"
              placeholder="Comment"
              value={lane.comment}
              onChange={(e) => handleChange(idx, "comment", e.target.value)}
              className="flex-1 p-2 bg-gray-800 rounded"
            />
          </div>

          <button
            onClick={() => handleRemoveLane(idx)}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Remove Lane
          </button>
        </div>
      ))}

      <div className="flex gap-4">
        <button
          onClick={handleAddLane}
          className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-lg text-white font-semibold"
        >
          Add Lane
        </button>
        <button
          onClick={handleGenerate}
          className="bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-lg text-white font-semibold"
        >
          Save & Generate DAT CSV
        </button>
      </div>
    </main>
  );
}
