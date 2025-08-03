import { useState } from "react";
import CityAutocomplete from "../components/CityAutocomplete";
import EquipmentSelect from "../components/EquipmentSelect";
import RandomizeModal from "../components/RandomizeModal";

const emptyLane = () => ({
  origin: "",
  destination: "",
  equipment: "",
  length: "",
  weight: "",
  randomize: false,
  earliest: "",
  latest: "",
  comment: "",
});

export default function Lanes() {
  const [lanes, setLanes] = useState([emptyLane()]);
  const [modalIdx, setModalIdx] = useState(null);

  const rand = (min, max) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

  const update = (i, field, val) =>
    setLanes((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [field]: val } : l))
    );

  const applyRandom = (min, max, all) =>
    setLanes((prev) =>
      prev.map((l, idx) =>
        all || idx === modalIdx
          ? { ...l, weight: rand(min, max), randomize: true }
          : l
      )
    );

  return (
    <div className="min-h-screen bg-[#14181F] text-[#E2E8F0] py-10 px-4">
      <h1 className="text-2xl font-bold mb-6">Lane Entry</h1>

      {lanes.map((lane, i) => (
        <div
          key={i}
          className="mb-8 space-y-4 p-5 rounded-lg border border-gray-800 bg-[#1E222B]"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold">Origin</label>
              <CityAutocomplete
                value={lane.origin}
                onChange={(v) => update(i, "origin", v)}
                placeholder="City, State"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Destination</label>
              <CityAutocomplete
                value={lane.destination}
                onChange={(v) => update(i, "destination", v)}
                placeholder="City, State"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Earliest Pickup Date</label>
              <input
                type="date"
                value={lane.earliest}
                onChange={(e) => update(i, "earliest", e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Latest Pickup Date</label>
              <input
                type="date"
                value={lane.latest}
                onChange={(e) => update(i, "latest", e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Equipment</label>
              <EquipmentSelect
                value={lane.equipment}
                onChange={(v) => update(i, "equipment", v)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Length (ft)</label>
              <input
                type="number"
                value={lane.length}
                onChange={(e) => update(i, "length", e.target.value)}
                className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-semibold">Weight (lbs)</label>
                <input
                  type="number"
                  value={lane.weight}
                  onChange={(e) => update(i, "weight", e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm mt-6 md:mt-0">
                <input
                  type="checkbox"
                  checked={lane.randomize}
                  onChange={(e) => {
                    if (e.target.checked) setModalIdx(i);
                    else update(i, "randomize", false);
                  }}
                  className="h-4 w-4"
                />
                Randomize
              </label>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Comment</label>
            <textarea
              rows={2}
              value={lane.comment}
              onChange={(e) => update(i, "comment", e.target.value)}
              placeholder="Reminder: You are posting to your email AND phone. Per DAT’s policy, any postings with Email / Phone Number typed in the comment box are auto-deleted."
              className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 italic placeholder-gray-400 text-sm"
            />
          </div>

          <button
            onClick={() => setLanes(lanes.filter((_, idx) => idx !== i))}
            className="text-red-500 hover:text-red-400 text-sm font-semibold"
          >
            Remove Lane
          </button>
        </div>
      ))}

      <button
        onClick={() => setLanes([...lanes, emptyLane()])}
        className="px-6 py-3 rounded-xl bg-[#4361EE] hover:bg-[#364db9] font-semibold shadow-lg"
      >
        Add New Lane
      </button>

      {/* Randomize Modal */}
      <RandomizeModal
        show={modalIdx !== null}
        onClose={() => setModalIdx(null)}
        apply={applyRandom}
      />
    </div>
  );
}
