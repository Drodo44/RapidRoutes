// pages/lanes.js
import { useState, useEffect, useRef } from "react";

/* ----------- CONFIG ----------- */

const equipmentOptions = [
  "Dry Van",
  "Reefer",
  "Flatbed",
  "Flatbed or Step Deck",
  "Conestoga",
  "Double Drop",
  "Lowboy",
  "Hotshot",
  "Hopper Bottom",
  "Container",
  "Auto Carrier",
];

const cityList = [
  "Atlanta, GA",
  "Charlotte, NC",
  "Chicago, IL",
  "Dallas, TX",
  "Denver, CO",
  "Houston, TX",
  "Los Angeles, CA",
  "Miami, FL",
  "New York, NY",
  "Phoenix, AZ",
  // ⬆️ Replace with full freight-city dataset or pull from Supabase
];

const randomWeight = () =>
  Math.floor(Math.random() * (48000 - 46750 + 1)) + 46750;

/* ----------- COMPONENT ----------- */

export default function Lanes() {
  const [lanes, setLanes] = useState([
    {
      origin: "",
      destination: "",
      equipment: "",
      length: "",
      weight: "",
      randomize: false,
      earliest: "",
      latest: "",
      comment: "",
    },
  ]);

  /* ---------- AUTOCOMPLETE ---------- */
  const [suggestions, setSuggestions] = useState([]);
  const [activeLaneIdx, setActiveLaneIdx] = useState(null);
  const suggRef = useRef(null);

  const updateSuggestions = (value) => {
    if (value.length < 2) return setSuggestions([]);
    const filtered = cityList.filter((c) =>
      c.toLowerCase().startsWith(value.toLowerCase())
    );
    setSuggestions(filtered.slice(0, 8));
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!suggRef.current?.contains(e.target)) setSuggestions([]);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------- LANE HANDLERS ---------- */
  const handleChange = (i, field, val) => {
    const copy = structuredClone(lanes);
    if (field === "randomize") {
      copy[i].randomize = val;
      copy[i].weight = val ? randomWeight() : "";
    } else {
      copy[i][field] = val;
      if (field === "origin" || field === "destination") {
        setActiveLaneIdx({ i, field });
        updateSuggestions(val);
      }
    }
    setLanes(copy);
  };

  const selectSuggestion = (text) => {
    if (activeLaneIdx) {
      const copy = structuredClone(lanes);
      copy[activeLaneIdx.i][activeLaneIdx.field] = text;
      setLanes(copy);
    }
    setSuggestions([]);
  };

  const addLane = () =>
    setLanes([
      ...lanes,
      {
        origin: "",
        destination: "",
        equipment: "",
        length: "",
        weight: "",
        randomize: false,
        earliest: "",
        latest: "",
        comment: "",
      },
    ]);

  const removeLane = (idx) =>
    setLanes(lanes.filter((_, id) => id !== idx));

  /* ---------- RENDER ---------- */
  return (
    <div className="min-h-screen bg-[#0f172a] text-white py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Lane Entry</h1>

      {lanes.map((lane, idx) => (
        <div
          key={idx}
          className="mb-8 rounded-xl border border-gray-800 bg-[#1e293b] p-5 space-y-4"
        >
          {/* TOP GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Origin */}
            <div className="relative">
              <label className="block mb-1 text-sm font-semibold">Origin</label>
              <input
                value={lane.origin}
                onChange={(e) =>
                  handleChange(idx, "origin", e.target.value)
                }
                placeholder="City, State"
                className="w-full text-sm px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
              {suggestions.length > 0 && activeLaneIdx?.i === idx ? (
                <ul
                  ref={suggRef}
                  className="absolute z-20 w-full mt-1 bg-gray-900 border border-gray-700 rounded overflow-y-auto max-h-56"
                >
                  {suggestions.map((c) => (
                    <li
                      key={c}
                      onClick={() => selectSuggestion(c)}
                      className="px-3 py-2 text-sm hover:bg-cyan-600 cursor-pointer"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* Destination */}
            <div className="relative">
              <label className="block mb-1 text-sm font-semibold">
                Destination
              </label>
              <input
                value={lane.destination}
                onChange={(e) =>
                  handleChange(idx, "destination", e.target.value)
                }
                placeholder="City, State"
                className="w-full text-sm px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
              {suggestions.length > 0 && activeLaneIdx?.i === idx ? (
                <ul
                  ref={suggRef}
                  className="absolute z-20 w-full mt-1 bg-gray-900 border border-gray-700 rounded overflow-y-auto max-h-56"
                >
                  {suggestions.map((c) => (
                    <li
                      key={c}
                      onClick={() => selectSuggestion(c)}
                      className="px-3 py-2 text-sm hover:bg-cyan-600 cursor-pointer"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* Equipment */}
            <div>
              <label className="block mb-1 mt-2 md:mt-0 text-sm font-semibold">
                Equipment
              </label>
              <select
                value={lane.equipment}
                onChange={(e) =>
                  handleChange(idx, "equipment", e.target.value)
                }
                className="w-full text-sm px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                <option value="">Select equipment</option>
                {equipmentOptions.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Length */}
            <div>
              <label className="block mb-1 mt-2 md:mt-0 text-sm font-semibold">
                Length (ft)
              </label>
              <input
                type="number"
                value={lane.length}
                onChange={(e) =>
                  handleChange(idx, "length", e.target.value)
                }
                placeholder="48"
                className="w-full text-sm px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
          </div>

          {/* WEIGHT + DATES */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Weight + Randomize */}
            <div>
              <label className="block mb-1 text-sm font-semibold">
                Weight (lbs)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={lane.weight}
                  onChange={(e) =>
                    handleChange(idx, "weight", e.target.value)
                  }
                  placeholder="46,750–48,000"
                  className="flex-1 text-sm px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-500 outline-none"
                />
                <label className="flex items-center gap-1 text-sm select-none">
                  <input
                    type="checkbox"
                    checked={lane.randomize}
                    onChange={(e) =>
                      handleChange(idx, "randomize", e.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Randomize
                </label>
              </div>
            </div>

            {/* Earliest */}
            <div>
              <label className="block mb-1 text-sm font-semibold">
                Earliest Pickup Date
              </label>
              <input
                type="date"
                value={lane.earliest}
                onChange={(e) =>
                  handleChange(idx, "earliest", e.target.value)
                }
                className="w-full text-sm px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
            {/* Latest */}
            <div>
              <label className="block mb-1 text-sm font-semibold">
                Latest Pickup Date
              </label>
              <input
                type="date"
                value={lane.latest}
                onChange={(e) =>
                  handleChange(idx, "latest", e.target.value)
                }
                className="w-full text-sm px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block mb-1 text-sm font-semibold">Comment</label>
            <textarea
              rows={2}
              value={lane.comment}
              onChange={(e) => handleChange(idx, "comment", e.target.value)}
              placeholder="Reminder: You are posting to your email AND phone. Per DAT’s policy, any postings with Email / Phone Number typed in the comment box are auto-deleted."
              className="w-full text-sm px-3 py-2 rounded bg-gray-800 border border-gray-700 italic placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>

          {/* Remove */}
          <button
            onClick={() => removeLane(idx)}
            className="text-red-500 hover:text-red-400 text-sm font-semibold"
          >
            Remove Lane
          </button>
        </div>
      ))}

      {/* Add New Lane */}
      <button
        onClick={addLane}
        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold shadow-lg"
      >
        Add New Lane
      </button>
    </div>
  );
}
