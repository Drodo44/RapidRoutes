import { useState } from "react";
import { supabase } from "../utils/supabaseClient";

const EQUIPMENT_TYPES = [
  "FD", "SD", "VAN", "REEFER", "RGN", "STEP", "CONESTOGA",
  "POWER ONLY", "FLATBED", "HOTSHOT", "BOX TRUCK", "INTERMODAL"
];

function defaultLane() {
  return {
    pickup_date_earliest: "",
    pickup_date_latest: "",
    pickup_city_state: "",
    pickup_city: "",
    pickup_state: "",
    pickup_zip: "",
    delivery_city_state: "",
    delivery_city: "",
    delivery_state: "",
    delivery_zip: "",
    equipment: "",
    length: "",
    weight: "",
    randomize: false,
    rand_min: "",
    rand_max: "",
    comment: ""
  };
}

export default function Lanes() {
  const [lanes, setLanes] = useState([defaultLane()]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper: fetch city/state/zip from Supabase cities table
  async function fetchCityStateZip(input) {
    if (!input.includes(",")) return {};
    const [cityRaw, stateRaw] = input.split(",").map(s => s.trim().toUpperCase());
    if (!cityRaw || !stateRaw) return {};
    const { data, error } = await supabase
      .from("cities")
      .select("city, state, zip")
      .ilike("city", cityRaw)
      .eq("state", stateRaw)
      .limit(1)
      .single();
    if (error || !data) return {};
    return {
      city: data.city,
      state: data.state,
      zip: data.zip
    };
  }

  // Handler: update lane field
  function handleLaneChange(idx, field, value) {
    const updated = [...lanes];
    updated[idx][field] = value;
    setLanes(updated);
  }

  // Handler: update lane + autofill city/state/zip if field is pickup or delivery city_state
  async function handleCityStateChange(idx, field, value) {
    handleLaneChange(idx, field, value);
    if (value.includes(",")) {
      const info = await fetchCityStateZip(value);
      if (info.city && info.state && info.zip) {
        if (field === "pickup_city_state") {
          handleLaneChange(idx, "pickup_city", info.city);
          handleLaneChange(idx, "pickup_state", info.state);
          handleLaneChange(idx, "pickup_zip", info.zip);
        } else {
          handleLaneChange(idx, "delivery_city", info.city);
          handleLaneChange(idx, "delivery_state", info.state);
          handleLaneChange(idx, "delivery_zip", info.zip);
        }
      }
    }
  }

  // Add new lane
  function addLane() {
    setLanes([...lanes, defaultLane()]);
  }

  // Remove lane
  function removeLane(idx) {
    setLanes(lanes.filter((_, i) => i !== idx));
  }

  // Batch: randomize all weights
  function randomizeAllWeights() {
    setLanes(lanes.map(lane =>
      lane.randomize
        ? lane
        : { ...lane, randomize: true, rand_min: lane.rand_min || "46750", rand_max: lane.rand_max || "48000" }
    ));
  }

  // Save lanes and generate CSV
  async function handleSaveAndExport() {
    setLoading(true);
    setMessage("Validating and saving lanes...");
    // Validate + autofill missing city/state/zip before saving
    const fixedLanes = await Promise.all(lanes.map(async (lane) => {
      // Autocomplete city/state/zip if missing
      if ((!lane.pickup_zip || !lane.delivery_zip) && lane.pickup_city_state && lane.delivery_city_state) {
        const p = await fetchCityStateZip(lane.pickup_city_state);
        const d = await fetchCityStateZip(lane.delivery_city_state);
        return {
          ...lane,
          pickup_city: p.city || lane.pickup_city,
          pickup_state: p.state || lane.pickup_state,
          pickup_zip: p.zip || lane.pickup_zip,
          delivery_city: d.city || lane.delivery_city,
          delivery_state: d.state || lane.delivery_state,
          delivery_zip: d.zip || lane.delivery_zip
        };
      }
      return lane;
    }));

    // Insert all lanes to Supabase (optional; skip if you only need local export)
    for (const lane of fixedLanes) {
      await supabase.from("lanes").insert([lane]);
    }

    setMessage("Generating DAT CSV...");
    // Import your exportDatCsv utility (assume it's in utils/exportDatCsv.js)
    const { default: exportDatCsv } = await import("../utils/exportDatCsv");
    const csvUrl = await exportDatCsv(fixedLanes.map(lane => ({
      ...lane,
      weight: lane.randomize
        ? (Math.floor(Math.random() * (parseInt(lane.rand_max || 48000) - parseInt(lane.rand_min || 46750) + 1)) + parseInt(lane.rand_min || 46750))
        : lane.weight
    })));
    setMessage("DAT CSV Ready!");
    setLoading(false);
    // Trigger CSV download
    const a = document.createElement("a");
    a.href = csvUrl;
    a.download = "RapidRoutes-DAT-Upload.csv";
    a.click();
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center py-8">
      <h1 className="text-3xl font-bold mb-6 text-cyan-400">RapidRoutes Lane Entry</h1>
      <div className="w-full max-w-7xl">
        <table className="min-w-full bg-gray-900 rounded-xl mb-4">
          <thead>
            <tr className="bg-gray-800 text-cyan-400">
              <th className="p-2">Earliest</th>
              <th className="p-2">Latest</th>
              <th className="p-2">Pickup City, State</th>
              <th className="p-2">Delivery City, State</th>
              <th className="p-2">Equipment</th>
              <th className="p-2">Length</th>
              <th className="p-2">Weight</th>
              <th className="p-2">Randomize?</th>
              <th className="p-2">Min</th>
              <th className="p-2">Max</th>
              <th className="p-2">Comment</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane, idx) => (
              <tr key={idx} className="even:bg-gray-800 odd:bg-gray-700">
                <td className="p-2">
                  <input type="date" value={lane.pickup_date_earliest}
                    onChange={e => handleLaneChange(idx, "pickup_date_earliest", e.target.value)}
                    className="bg-gray-900 text-white p-1 rounded w-32" required />
                </td>
                <td className="p-2">
                  <input type="date" value={lane.pickup_date_latest}
                    onChange={e => handleLaneChange(idx, "pickup_date_latest", e.target.value)}
                    className="bg-gray-900 text-white p-1 rounded w-32" />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={lane.pickup_city_state}
                    onChange={e => handleCityStateChange(idx, "pickup_city_state", e.target.value)}
                    placeholder="Maplesville, AL"
                    className="bg-gray-900 text-white p-1 rounded w-52"
                    required
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={lane.delivery_city_state}
                    onChange={e => handleCityStateChange(idx, "delivery_city_state", e.target.value)}
                    placeholder="Moultrie, GA"
                    className="bg-gray-900 text-white p-1 rounded w-52"
                    required
                  />
                </td>
                <td className="p-2">
                  <select
                    value={lane.equipment}
                    onChange={e => handleLaneChange(idx, "equipment", e.target.value)}
                    className="bg-gray-900 text-white p-1 rounded"
                    required
                  >
                    <option value="">Select</option>
                    {EQUIPMENT_TYPES.map(e => <option key={e}>{e}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    value={lane.length}
                    onChange={e => handleLaneChange(idx, "length", e.target.value)}
                    className="bg-gray-900 text-white p-1 rounded w-20"
                    required
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    value={lane.randomize ? "" : lane.weight}
                    onChange={e => handleLaneChange(idx, "weight", e.target.value)}
                    className="bg-gray-900 text-white p-1 rounded w-24"
                    disabled={lane.randomize}
                    required={!lane.randomize}
                  />
                </td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={lane.randomize}
                    onChange={e => handleLaneChange(idx, "randomize", e.target.checked)}
                  />
                </td>
                <td className="p-2">
                  {lane.randomize && (
                    <input
                      type="number"
                      value={lane.rand_min}
                      onChange={e => handleLaneChange(idx, "rand_min", e.target.value)}
                      className="bg-gray-900 text-white p-1 rounded w-16"
                      placeholder="Min"
                      required
                    />
                  )}
                </td>
                <td className="p-2">
                  {lane.randomize && (
                    <input
                      type="number"
                      value={lane.rand_max}
                      onChange={e => handleLaneChange(idx, "rand_max", e.target.value)}
                      className="bg-gray-900 text-white p-1 rounded w-16"
                      placeholder="Max"
                      required
                    />
                  )}
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={lane.comment}
                    onChange={e => handleLaneChange(idx, "comment", e.target.value)}
                    className="bg-gray-900 text-white p-1 rounded w-36"
                  />
                </td>
                <td className="p-2 text-center">
                  {lanes.length > 1 && (
                    <button
                      type="button"
                      className="bg-red-700 hover:bg-red-900 text-white px-2 rounded"
                      onClick={() => removeLane(idx)}
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-4 mb-8">
          <button
            type="button"
            onClick={addLane}
            className="bg-green-700 hover:bg-green-900 text-white px-4 py-2 rounded"
          >
            Add Lane
          </button>
          <button
            type="button"
            onClick={randomizeAllWeights}
            className="bg-blue-700 hover:bg-blue-900 text-white px-4 py-2 rounded"
          >
            Randomize All Weights
          </button>
          <button
            type="button"
            onClick={handleSaveAndExport}
            className="bg-cyan-600 hover:bg-cyan-800 text-white px-4 py-2 rounded"
            disabled={loading}
          >
            {loading ? "Working..." : "Save & Generate DAT CSV"}
          </button>
        </div>
        {message && <div className="text-cyan-400 mb-4">{message}</div>}
      </div>
    </div>
  );
}
