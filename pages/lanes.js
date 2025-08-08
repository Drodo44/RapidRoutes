// pages/lanes.js
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import CityAutocomplete from "../components/CityAutocomplete";
import EquipmentSelect from "../components/EquipmentSelect";
import RandomizeWeightPopup from "../components/RandomizeWeightPopup";

export default function Lanes() {
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    equipment: "",
    weight: "",
    length: "",
    date: "",
    comment: "",
  });
  // Whether to randomize the weight for this lane
  const [randomizeWeight, setRandomizeWeight] = useState(false);
  // Range selected for random weight (min/max). Defaults to dry‑van range
  const [weightRange, setWeightRange] = useState({ min: 46750, max: 48000 });
  // If the user chooses to apply the selected range to all new lanes, store it here
  const [globalRange, setGlobalRange] = useState(null);
  // Controls visibility of the randomization popup
  const [showPopup, setShowPopup] = useState(false);
  const [suggestedComment, setSuggestedComment] = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleEquipmentChange = (val) => {
    setForm((f) => ({ ...f, equipment: val.split(" ").pop() }));
  };

  const suggestComment = () => {
    const { origin, destination, equipment } = form;
    if (!origin || !destination || !equipment) return;
    const comment = `Popular ${equipment} route from ${origin} to ${destination} — strong reload lane`;
    setSuggestedComment(comment);
    setForm((f) => ({ ...f, comment }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Determine the weight value. If randomization is on, generate a random
    // number within the selected range. Otherwise use the exact weight input.
    let weightValue;
    if (randomizeWeight) {
      const rangeToUse = globalRange || weightRange;
      const minW = parseInt(rangeToUse.min, 10);
      const maxW = parseInt(rangeToUse.max, 10);
      weightValue = Math.floor(Math.random() * (maxW - minW + 1)) + minW;
    } else {
      weightValue = form.weight;
    }
    const { error } = await supabase.from("lanes").insert([
      { ...form, weight: parseInt(weightValue, 10) },
    ]);
    if (error) {
      alert("Error saving lane.");
    } else {
      alert("Lane created!");
      setForm({
        origin: "",
        destination: "",
        equipment: "",
        weight: "",
        length: "",
        date: "",
        comment: "",
      });
      setSuggestedComment("");
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-xl mx-auto bg-[#1a2236] p-8 rounded-2xl shadow-2xl text-white">
        <h1 className="text-3xl font-bold mb-6 text-cyan-400">Create New Lane</h1>

        <form onSubmit={handleSubmit}>
          {/* Origin and destination autocompletes */}
          <label className="block mb-1">Origin City/State</label>
          <CityAutocomplete
            value={form.origin}
            onChange={(val) => setForm((f) => ({ ...f, origin: val }))}
            placeholder="Start typing city…"
          />
          <div className="h-4" />
          <label className="block mb-1">Destination City/State</label>
          <CityAutocomplete
            value={form.destination}
            onChange={(val) => setForm((f) => ({ ...f, destination: val }))}
            placeholder="Start typing city…"
          />
          <div className="h-4" />

          <label className="block mb-1">Equipment (DAT Code)</label>
          <EquipmentSelect
            value={form.equipment}
            onChange={(val) => handleEquipmentChange(val)}
          />
          <div className="h-4" />

          <label className="block mb-1">Weight (lbs)</label>
          <input
            name="weight"
            type="number"
            required={!randomizeWeight}
            disabled={randomizeWeight}
            value={form.weight}
            onChange={handleChange}
            className="mb-2 w-full p-3 rounded bg-[#222f45] border border-gray-700"
          />
          {/* Randomization controls: when not randomized, show a button to open the popup. When randomized, display the range and option to clear. */}
          <div className="flex items-center mb-4">
            {randomizeWeight ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-400">
                  Randomized {globalRange ? `${globalRange.min}–${globalRange.max}` : `${weightRange.min}–${weightRange.max}`} lbs
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRandomizeWeight(false);
                  }}
                  className="text-red-400 underline"
                >
                  Clear
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowPopup(true)}
                className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Randomize
              </button>
            )}
          </div>
          {showPopup && (
            <RandomizeWeightPopup
              onClose={() => setShowPopup(false)}
              setRange={(r) => {
                setWeightRange(r);
                // Also update global range if user chooses apply all
              }}
              setGlobal={(applyAll) => {
                if (applyAll) {
                  setGlobalRange(weightRange);
                } else {
                  setGlobalRange(null);
                }
              }}
              setRandomize={setRandomizeWeight}
              defaultRange={weightRange}
            />
          )}

          <label className="block mb-1">Length (ft)</label>
          <input
            name="length"
            type="number"
            required
            value={form.length}
            onChange={handleChange}
            className="mb-4 w-full p-3 rounded bg-[#222f45] border border-gray-700"
          />

          <label className="block mb-1">Pickup Date</label>
          <input
            name="date"
            type="date"
            required
            value={form.date}
            onChange={handleChange}
            className="mb-4 w-full p-3 rounded bg-[#222f45] border border-gray-700"
          />

          <label className="block mb-1">Comment (Optional)</label>
          <textarea
            name="comment"
            value={form.comment}
            onChange={handleChange}
            className="mb-2 w-full p-3 rounded bg-[#222f45] border border-gray-700"
          />
          {suggestedComment && (
            <div className="mb-4 text-green-400 text-sm">
              Suggested: “{suggestedComment}”
            </div>
          )}
          <button
            type="button"
            onClick={suggestComment}
            className="w-full bg-blue-800 hover:bg-blue-900 py-2 rounded-xl mb-4 font-semibold"
          >
            Suggest DAT Comment
          </button>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-xl font-bold"
          >
            Create Lane
          </button>
        </form>
      </div>
    </div>
  );
}
