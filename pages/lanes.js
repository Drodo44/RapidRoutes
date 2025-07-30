// /pages/lanes.js

import { useState } from "react";
import EQUIPMENT_TYPES from "../data/equipmentTypes";
import { supabase } from "../utils/supabaseClient";

const defaultLane = {
  earliest: "",
  latest: "",
  origin: "",
  originCity: "",
  originState: "",
  originZip: "",
  dest: "",
  destCity: "",
  destState: "",
  destZip: "",
  length: "",
  weight: "",
  equipment: "",
  comment: "",
  randomize: false,
};

export default function Lanes() {
  const [lanes, setLanes] = useState([{ ...defaultLane }]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [searchType, setSearchType] = useState({ idx: 0, field: "origin" }); // which row and which field is being searched

  // Helper: Fetch city suggestions from Supabase
  async function fetchCitySuggestions(value) {
    if (!value || value.length < 2) {
      setCitySuggestions([]);
      return;
    }
    setCityLoading(true);
    // Modify this if your Supabase cities table is named differently!
    const { data, error } = await supabase
      .from("cities") // or "allcities"
      .select("city,state,zip")
      .ilike("city", `%${value}%`)
      .limit(10);

    setCitySuggestions(data || []);
    setCityLoading(false);
  }

  // Lane field change handler
  function handleChange(idx, key, value) {
    setLanes(lanes =>
      lanes.map((lane, i) => (i === idx ? { ...lane, [key]: value } : lane))
    );
  }

  // Handle city selection
  function handleCitySelect(idx, field, cityObj) {
    // e.g. field = "origin" or "dest"
    setLanes(lanes =>
      lanes.map((lane, i) =>
        i === idx
          ? {
              ...lane,
              [`${field}`]: `${cityObj.city}, ${cityObj.state}`,
              [`${field}City`]: cityObj.city,
              [`${field}State`]: cityObj.state,
              [`${field}Zip`]: cityObj.zip,
            }
          : lane
      )
    );
    setCitySuggestions([]);
  }

  // Add/remove lane rows
  function addLane() {
    setLanes([...lanes, { ...defaultLane }]);
  }
  function removeLane(idx) {
    setLanes(lanes => lanes.filter((_, i) => i !== idx));
  }

  // Generate CSV (stub; you may want to hook up your own CSV export logic)
  function exportCsv() {
    // Your CSV export function here (from /lib/datExport.js)
    // This is a stub for now
    alert("CSV Export coming soon! (Hook up your /lib/datExport.js)");
  }

  return (
    <main className="p-8 min-h-screen bg-gradient-to-b from-[#141b2c] to-[#101a2d] text-white">
      <h1 className="text-3xl font-bold mb-6 text-cyan-400">Lane Entry</h1>

      {lanes.map((lane, idx) => (
        <div key={idx} className="bg-[#1b2336] rounded-2xl p-6 mb-6 shadow-lg grid grid-cols-1 md:grid-cols-9 gap-4 items-center">
          {/* Pickup Date Earliest */}
          <input
            type="date"
            className="input"
            value={lane.earliest}
            onChange={e => handleChange(idx, "earliest", e.target.value)}
            placeholder="Pickup Earliest"
          />

          {/* Pickup Date Latest */}
          <input
            type="date"
            className="input"
            value={lane.latest}
            onChange={e => handleChange(idx, "latest", e.target.value)}
            placeholder="Pickup Latest"
          />

          {/* Origin City/State (autocomplete) */}
          <div className="relative">
            <input
              className="input"
              placeholder="Origin City"
              value={lane.origin}
              onChange={e => {
                handleChange(idx, "origin", e.target.value);
                setSearchType({ idx, field: "origin" });
                fetchCitySuggestions(e.target.value);
              }}
              autoComplete="off"
            />
            {/* Suggestions dropdown */}
            {citySuggestions.length > 0 && searchType.idx === idx && searchType.field === "origin" && (
              <div className="absolute z-20 bg-[#232a3c] border border-cyan-600 w-full mt-1 rounded shadow-lg max-h-40 overflow-y-auto">
                {citySuggestions.map((sug, i) => (
                  <div
                    key={i}
                    className="p-2 cursor-pointer hover:bg-cyan-900"
                    onClick={() => handleCitySelect(idx, "origin", sug)}
                  >
                    {sug.city}, {sug.state} {sug.zip}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Destination City/State (autocomplete) */}
          <div className="relative">
            <input
              className="input"
              placeholder="Destination City"
              value={lane.dest}
              onChange={e => {
                handleChange(idx, "dest", e.target.value);
                setSearchType({ idx, field: "dest" });
                fetchCitySuggestions(e.target.value);
              }}
              autoComplete="off"
            />
            {/* Suggestions dropdown */}
            {citySuggestions.length > 0 && searchType.idx === idx && searchType.field === "dest" && (
              <div className="absolute z-20 bg-[#232a3c] border border-cyan-600 w-full mt-1 rounded shadow-lg max-h-40 overflow-y-auto">
                {citySuggestions.map((sug, i) => (
                  <div
                    key={i}
                    className="p-2 cursor-pointer hover:bg-cyan-900"
                    onClick={() => handleCitySelect(idx, "dest", sug)}
                  >
                    {sug.city}, {sug.state} {sug.zip}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Length */}
          <input
            type="number"
            min={1}
            className="input"
            value={lane.length}
            onChange={e => handleChange(idx, "length", e.target.value)}
            placeholder="Length (ft)"
          />

          {/* Weight */}
          <input
            type="number"
            min={1}
            className="input"
            value={lane.weight}
            onChange={e => handleChange(idx, "weight", e.target.value)}
            placeholder="Weight (lbs)"
          />

          {/* Equipment Dropdown */}
          <select
            className="input"
            value={lane.equipment}
            onChange={e => handleChange(idx, "equipment", e.target.value)}
          >
            <option value="">Select Equipment</option>
            {EQUIPMENT_TYPES.map(opt => (
              <option key={opt.code} value={opt.code}>
                {opt.desc} - {opt.code}
              </option>
            ))}
          </select>

          {/* Comment */}
          <input
            type="text"
            className="input"
            value={lane.comment}
            onChange={e => handleChange(idx, "comment", e.target.value)}
            placeholder="Comment"
          />

          {/* Randomize */}
          <div className="flex items-center space-x-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={lane.randomize}
                onChange={e => handleChange(idx, "randomize", e.target.checked)}
                className="mr-2"
              />
              Randomize
            </label>
            <button
              className="ml-4 text-red-400 hover:text-red-600"
              onClick={() => removeLane(idx)}
              disabled={lanes.length === 1}
              title="Remove Lane"
            >
              ✖
            </button>
          </div>
        </div>
      ))}

      <div className="flex space-x-4 mt-2">
        <button
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-2xl"
          onClick={addLane}
        >
          + Add Lane
        </button>
        <button
          className="bg-cyan-700 hover:bg-cyan-800 text-white font-bold py-2 px-4 rounded-2xl"
          onClick={exportCsv}
        >
          Save & Generate DAT CSV
        </button>
      </div>
    </main>
  );
}

// Minimal tailwind "input" class, add this to your CSS if not present
// .input { @apply px-3 py-2 rounded bg-[#232a3c] text-white border border-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-full; }
