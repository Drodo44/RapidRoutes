// pages/lanes.js
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import { equipmentTypes } from "../utils/laneHelpers";
import { generateDATCsv } from "../lib/datExport";

export default function Lanes() {
  const [lanes, setLanes] = useState([
    {
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
      equipment: "",
      length: "",
      weight: "",
      randomize: false,
      rndMin: "",
      rndMax: "",
      comment: "",
    },
  ]);
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [originTimeout, setOriginTimeout] = useState(null);
  const [destTimeout, setDestTimeout] = useState(null);

  // Fetch city/state from Supabase
  const fetchCitySuggestions = async (input, setter) => {
    if (!input || input.length < 2) {
      setter([]);
      return;
    }
    // Query: city or city,state
    const [city, state] = input.split(",").map((str) => str.trim());
    let query = supabase.from("cities").select("city,state,zip").ilike("city", `${city}%`);
    if (state) query = query.ilike("state", `${state}%`);
    const { data } = await query.limit(10);
    setter(data || []);
  };

  // Update lane values
  const handleChange = (idx, field, value) => {
    const updated = [...lanes];
    updated[idx][field] = value;
    setLanes(updated);
    // Autofill ZIP/city/state on selection
    if (field === "origin") {
      clearTimeout(originTimeout);
      setOriginTimeout(
        setTimeout(() => fetchCitySuggestions(value, setOriginSuggestions), 200)
      );
    }
    if (field === "dest") {
      clearTimeout(destTimeout);
      setDestTimeout(
        setTimeout(() => fetchCitySuggestions(value, setDestSuggestions), 200)
      );
    }
  };
  // Handle origin autofill from selection
  const handleOriginSelect = (idx, cityObj) => {
    const updated = [...lanes];
    updated[idx].origin = `${cityObj.city}, ${cityObj.state}`;
    updated[idx].originCity = cityObj.city;
    updated[idx].originState = cityObj.state;
    updated[idx].originZip = cityObj.zip;
    setLanes(updated);
    setOriginSuggestions([]);
  };
  // Handle dest autofill from selection
  const handleDestSelect = (idx, cityObj) => {
    const updated = [...lanes];
    updated[idx].dest = `${cityObj.city}, ${cityObj.state}`;
    updated[idx].destCity = cityObj.city;
    updated[idx].destState = cityObj.state;
    updated[idx].destZip = cityObj.zip;
    setLanes(updated);
    setDestSuggestions([]);
  };

  // Add new lane
  const handleAddLane = () => {
    setLanes([
      ...lanes,
      {
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
        equipment: "",
        length: "",
        weight: "",
        randomize: false,
        rndMin: "",
        rndMax: "",
        comment: "",
      },
    ]);
  };

  // Export to DAT CSV
  const handleExport = () => generateDATCsv(lanes);

  return (
    <div className="min-h-screen bg-[#0b1322] text-white p-8">
      <h1 className="text-cyan-400 text-3xl font-bold mb-8 text-center">
        RapidRoutes Lane Entry
      </h1>
      <div className="bg-[#182134] p-4 rounded-lg shadow-lg">
        <div className="grid grid-cols-11 gap-3 mb-2 text-cyan-300 font-bold text-sm">
          <div>Earliest</div>
          <div>Latest</div>
          <div>Pickup City, State</div>
          <div>Delivery City, State</div>
          <div>Equipment</div>
          <div>Length</div>
          <div>Weight</div>
          <div>Randomize</div>
          <div>Min</div>
          <div>Max</div>
          <div>Comment</div>
        </div>
        {lanes.map((lane, idx) => (
          <div
            key={idx}
            className="grid grid-cols-11 gap-3 mb-2 items-center text-base"
          >
            <input
              type="date"
              className="rounded p-1 bg-[#232a3c] text-white"
              value={lane.earliest}
              onChange={(e) => handleChange(idx, "earliest", e.target.value)}
            />
            <input
              type="date"
              className="rounded p-1 bg-[#232a3c] text-white"
              value={lane.latest}
              onChange={(e) => handleChange(idx, "latest", e.target.value)}
            />
            <div className="relative">
              <input
                type="text"
                placeholder="City, State"
                className="rounded p-1 bg-[#232a3c] text-white w-full"
                value={lane.origin}
                onChange={(e) => handleChange(idx, "origin", e.target.value)}
                autoComplete="off"
              />
              {originSuggestions.length > 0 && (
                <ul className="absolute left-0 w-full bg-[#222940] border border-cyan-600 z-10 rounded mt-1">
                  {originSuggestions.map((city) => (
                    <li
                      key={city.city + city.state + city.zip}
                      className="p-2 hover:bg-cyan-800 cursor-pointer"
                      onClick={() => handleOriginSelect(idx, city)}
                    >
                      {city.city}, {city.state} ({city.zip})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="City, State"
                className="rounded p-1 bg-[#232a3c] text-white w-full"
                value={lane.dest}
                onChange={(e) => handleChange(idx, "dest", e.target.value)}
                autoComplete="off"
              />
              {destSuggestions.length > 0 && (
                <ul className="absolute left-0 w-full bg-[#222940] border border-cyan-600 z-10 rounded mt-1">
                  {destSuggestions.map((city) => (
                    <li
                      key={city.city + city.state + city.zip}
                      className="p-2 hover:bg-cyan-800 cursor-pointer"
                      onClick={() => handleDestSelect(idx, city)}
                    >
                      {city.city}, {city.state} ({city.zip})
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <select
              className="rounded p-1 bg-[#232a3c] text-white"
              value={lane.equipment}
              onChange={(e) => handleChange(idx, "equipment", e.target.value)}
            >
              <option value="">Select</option>
              {equipmentTypes.map((eq) => (
                <option key={eq.code} value={eq.code}>
                  {eq.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="rounded p-1 bg-[#232a3c] text-white"
              value={lane.length}
              onChange={(e) => handleChange(idx, "length", e.target.value)}
              placeholder="Length"
            />
            <input
              type="number"
              className="rounded p-1 bg-[#232a3c] text-white"
              value={lane.weight}
              onChange={(e) => handleChange(idx, "weight", e.target.value)}
              placeholder="Weight"
              disabled={lane.randomize}
            />
            <input
              type="checkbox"
              checked={lane.randomize}
              onChange={(e) => handleChange(idx, "randomize", e.target.checked)}
              className="mx-auto"
            />
            <input
              type="number"
              className="rounded p-1 bg-[#232a3c] text-white"
              value={lane.rndMin}
              onChange={(e) => handleChange(idx, "rndMin", e.target.value)}
              placeholder="Min"
              disabled={!lane.randomize}
            />
            <input
              type="number"
              className="rounded p-1 bg-[#232a3c] text-white"
              value={lane.rndMax}
              onChange={(e) => handleChange(idx, "rndMax", e.target.value)}
              placeholder="Max"
              disabled={!lane.randomize}
            />
            <input
              type="text"
              className="rounded p-1 bg-[#232a3c] text-white"
              value={lane.comment}
              onChange={(e) => handleChange(idx, "comment", e.target.value)}
              placeholder="Comment"
            />
          </div>
        ))}
        <div className="flex space-x-4 mt-2">
          <button
            className="bg-emerald-700 hover:bg-emerald-600 px-4 py-2 rounded"
            onClick={handleAddLane}
          >
            Add Lane
          </button>
          <button
            className="bg-cyan-700 hover:bg-cyan-600 px-4 py-2 rounded"
            onClick={handleExport}
          >
            Save & Generate DAT CSV
          </button>
        </div>
      </div>
    </div>
  );
}
