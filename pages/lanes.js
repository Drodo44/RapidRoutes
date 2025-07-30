// pages/lanes.js
import { useState } from "react";
import { equipmentTypes, getCitySuggestions } from "../utils/laneHelpers";
import { generateDATCsv } from "../lib/datExport";

export default function Lanes() {
  // Lane data structure
  const [lanes, setLanes] = useState([
    {
      earliest: "",
      latest: "",
      origin: "",
      originZip: "",
      dest: "",
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
  // Global randomize
  const [globalRndMin, setGlobalRndMin] = useState("");
  const [globalRndMax, setGlobalRndMax] = useState("");

  // Autocomplete logic for City, State
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);

  // Handle change for lane fields
  const handleChange = (idx, field, value) => {
    const updated = [...lanes];
    updated[idx][field] = value;
    setLanes(updated);
    // Autofill ZIP when city, state is chosen
    if (field === "origin" && value.includes(", ")) {
      const suggestion = getCitySuggestions(value)[0];
      if (suggestion) updated[idx].originZip = suggestion.zip;
    }
    if (field === "dest" && value.includes(", ")) {
      const suggestion = getCitySuggestions(value)[0];
      if (suggestion) updated[idx].destZip = suggestion.zip;
    }
  };

  // Add lane row
  const handleAddLane = () => {
    setLanes([
      ...lanes,
      {
        earliest: "",
        latest: "",
        origin: "",
        originZip: "",
        dest: "",
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

  // Randomize all weights for lanes
  const handleRandomizeAll = () => {
    setLanes((prev) =>
      prev.map((lane) =>
        lane.randomize && globalRndMin && globalRndMax
          ? {
              ...lane,
              weight:
                Math.floor(
                  Math.random() *
                    (parseInt(globalRndMax) - parseInt(globalRndMin) + 1)
                ) + parseInt(globalRndMin),
            }
          : lane
      )
    );
  };

  // CSV Generation
  const handleExport = () => {
    generateDATCsv(lanes);
  };

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
            <input
              type="text"
              placeholder="City, State"
              className="rounded p-1 bg-[#232a3c] text-white"
              value={lane.origin}
              onChange={(e) => {
                handleChange(idx, "origin", e.target.value);
                setOriginSuggestions(getCitySuggestions(e.target.value));
              }}
              list={`origin-suggest-${idx}`}
              autoComplete="off"
            />
            <datalist id={`origin-suggest-${idx}`}>
              {originSuggestions.map((city) => (
                <option key={city.city + city.state} value={`${city.city}, ${city.state}`} />
              ))}
            </datalist>
            <input
              type="text"
              placeholder="City, State"
              className="rounded p-1 bg-[#232a3c] text-white"
              value={lane.dest}
              onChange={(e) => {
                handleChange(idx, "dest", e.target.value);
                setDestSuggestions(getCitySuggestions(e.target.value));
              }}
              list={`dest-suggest-${idx}`}
              autoComplete="off"
            />
            <datalist id={`dest-suggest-${idx}`}>
              {destSuggestions.map((city) => (
                <option key={city.city + city.state} value={`${city.city}, ${city.state}`} />
              ))}
            </datalist>
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
            className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded"
            onClick={handleRandomizeAll}
          >
            Randomize All Weights
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
