// pages/lanes.js
import { useState } from "react";

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

const randomWeight = () =>
  Math.floor(Math.random() * (48000 - 46750 + 1)) + 46750;

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

  const handleChange = (idx, field, value) => {
    const updated = [...lanes];
    if (field === "randomize") {
      updated[idx].randomize = value;
      updated[idx].weight = value ? randomWeight() : "";
    } else {
      updated[idx][field] = value;
    }
    setLanes(updated);
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
    setLanes(lanes.filter((_, laneIdx) => laneIdx !== idx));

  return (
    <div className="min-h-screen bg-gray-950 py-10 px-4 text-white">
      <h1 className="text-3xl font-bold mb-8">Lane Entry</h1>

      {lanes.map((lane, idx) => (
        <div
          key={idx}
          className="mb-10 border border-gray-800 rounded-xl p-6 space-y-4 bg-gray-900"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Origin / Destination */}
            <div>
              <label className="block mb-1 text-sm font-semibold">Origin</label>
              <input
                type="text"
                value={lane.origin}
                onChange={(e) => handleChange(idx, "origin", e.target.value)}
                placeholder="City, State"
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm"
                list="cities"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-semibold">
                Destination
              </label>
              <input
                type="text"
                value={lane.destination}
                onChange={(e) =>
                  handleChange(idx, "destination", e.target.value)
                }
                placeholder="City, State"
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm"
                list="cities"
              />
            </div>

            {/* Equipment / Length */}
            <div>
              <label className="block mb-1 text-sm font-semibold">
                Equipment
              </label>
              <select
                value={lane.equipment}
                onChange={(e) =>
                  handleChange(idx, "equipment", e.target.value)
                }
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm"
              >
                <option value="">Select equipment</option>
                {equipmentOptions.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm font-semibold">
                Length (ft)
              </label>
              <input
                type="number"
                value={lane.length}
                onChange={(e) => handleChange(idx, "length", e.target.value)}
                placeholder="e.g., 48"
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm"
              />
            </div>

            {/* Weight + Randomize */}
            <div className="flex flex-col">
              <label className="mb-1 text-sm font-semibold">Weight (lbs)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={lane.weight}
                  onChange={(e) =>
                    handleChange(idx, "weight", e.target.value)
                  }
                  disabled={lane.randomize}
                  placeholder="46,750–48,000"
                  className={`flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm ${
                    lane.randomize ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                />
                <label className="flex items-center gap-1 text-sm">
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

            {/* Dates */}
            <div>
              <label className="block mb-1 text-sm font-semibold">
                Earliest Pickup Date
              </label>
              <input
                type="date"
                value={lane.earliest}
                onChange={(e) => handleChange(idx, "earliest", e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-semibold">
                Latest Pickup Date
              </label>
              <input
                type="date"
                value={lane.latest}
                onChange={(e) => handleChange(idx, "latest", e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm"
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
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 text-sm italic placeholder-gray-400"
            />
          </div>

          {/* Remove Lane */}
          <button
            onClick={() => removeLane(idx)}
            className="text-red-500 hover:text-red-400 text-sm font-semibold"
          >
            Remove Lane
          </button>
        </div>
      ))}

      <button
        onClick={addLane}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold shadow-lg"
      >
        Add New Lane
      </button>

      {/* Datalist stub for city autocomplete */}
      <datalist id="cities">
        <option value="New York, NY" />
        <option value="Chicago, IL" />
        <option value="Los Angeles, CA" />
        <option value="Houston, TX" />
        <option value="Dallas, TX" />
        <option value="Atlanta, GA" />
        <option value="Miami, FL" />
      </datalist>
    </div>
  );
}
