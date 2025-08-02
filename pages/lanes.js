import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { generateDatCsv } from "../lib/exportDatCsv";
import { saveAs } from "file-saver";

export default function Lanes() {
  const [lanes, setLanes] = useState([]);
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    equipment: "FD",
    length: 48,
    baseWeight: "",
    randomizeWeight: false,
    randomLow: 46750,
    randomHigh: 48000,
    dateEarliest: "",
    dateLatest: "",
    commodity: "",
    note: "",
  });

  const updateForm = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addLane = async () => {
    const lane = { ...form };
    const { data, error } = await supabase.from("lanes").insert([lane]);
    if (!error) setLanes([...lanes, lane]);
  };

  const generateCsv = async () => {
    const csv = await generateDatCsv(lanes, {});
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "DAT_Upload.csv");
  };

  const downloadRecap = () => {
    window.open("/api/export/recap", "_blank");
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-4">Enter Lane</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-900 p-4 rounded">
        <input
          type="text"
          placeholder="Origin City, State"
          className="p-2 rounded bg-gray-800"
          value={form.origin}
          onChange={(e) => updateForm("origin", e.target.value)}
        />
        <input
          type="text"
          placeholder="Destination City, State"
          className="p-2 rounded bg-gray-800"
          value={form.destination}
          onChange={(e) => updateForm("destination", e.target.value)}
        />
        <input
          type="text"
          placeholder="Equipment"
          className="p-2 rounded bg-gray-800"
          value={form.equipment}
          onChange={(e) => updateForm("equipment", e.target.value)}
        />
        <input
          type="number"
          placeholder="Length (ft)"
          className="p-2 rounded bg-gray-800"
          value={form.length}
          onChange={(e) => updateForm("length", e.target.value)}
        />
        {!form.randomizeWeight ? (
          <input
            type="number"
            placeholder="Weight (lbs)"
            className="p-2 rounded bg-gray-800"
            value={form.baseWeight}
            onChange={(e) => updateForm("baseWeight", e.target.value)}
          />
        ) : (
          <>
            <input
              type="number"
              placeholder="Min Weight"
              className="p-2 rounded bg-gray-800"
              value={form.randomLow}
              onChange={(e) => updateForm("randomLow", e.target.value)}
            />
            <input
              type="number"
              placeholder="Max Weight"
              className="p-2 rounded bg-gray-800"
              value={form.randomHigh}
              onChange={(e) => updateForm("randomHigh", e.target.value)}
            />
          </>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.randomizeWeight}
            onChange={(e) => updateForm("randomizeWeight", e.target.checked)}
          />
          Randomize weight
        </label>
        <input
          type="date"
          placeholder="Pickup Earliest"
          className="p-2 rounded bg-gray-800"
          value={form.dateEarliest}
          onChange={(e) => updateForm("dateEarliest", e.target.value)}
        />
        <input
          type="date"
          placeholder="Pickup Latest"
          className="p-2 rounded bg-gray-800"
          value={form.dateLatest}
          onChange={(e) => updateForm("dateLatest", e.target.value)}
        />
        <input
          type="text"
          placeholder="Commodity"
          className="p-2 rounded bg-gray-800"
          value={form.commodity}
          onChange={(e) => updateForm("commodity", e.target.value)}
        />
        <input
          type="text"
          placeholder="Note (optional)"
          className="p-2 rounded bg-gray-800 col-span-2"
          value={form.note}
          onChange={(e) => updateForm("note", e.target.value)}
        />
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={addLane}
          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-white"
        >
          Add Lane
        </button>
        <button
          onClick={generateCsv}
          className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded text-white"
        >
          Generate DAT CSV
        </button>
        <button
          onClick={downloadRecap}
          className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded text-white"
        >
          Download Recap Excel
        </button>
      </div>
    </main>
  );
}
