import { useState } from "react";

/**
 * Popup allowing brokers to choose a min/max weight range for randomization.
 * When the user clicks one of the apply buttons, the selected range is
 * propagated back to the parent via `setRange` and `setRandomize`. If
 * `applyAll` is true, `setGlobal` is also triggered to indicate the range
 * should apply to all lanes created during this session.
 */
export default function RandomizeWeightPopup({ onClose, setRange, setGlobal, setRandomize, defaultRange }) {
  const [range, updateRange] = useState(defaultRange || { min: 46750, max: 48000 });

  const handleApply = (applyAll = false) => {
    // Persist the selected range to the parent component
    setRange(range);
    setRandomize(true);
    if (applyAll) {
      setGlobal(true);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center">
      <div className="bg-gray-900 p-6 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-cyan-400 text-center">Randomize Weight</h2>

        <label className="block text-sm mb-2">Min (lbs):</label>
        <input
          type="number"
          value={range.min}
          onChange={(e) => updateRange({ ...range, min: Number(e.target.value) })}
          className="input mb-4"
        />

        <label className="block text-sm mb-2">Max (lbs):</label>
        <input
          type="number"
          value={range.max}
          onChange={(e) => updateRange({ ...range, max: Number(e.target.value) })}
          className="input mb-6"
        />

        <div className="flex justify-between">
          <button onClick={() => handleApply(false)} className="bg-blue-700 hover:bg-blue-800 text-white py-2 px-4 rounded-lg font-semibold">
            Apply to This Lane Only
          </button>
          <button onClick={() => handleApply(true)} className="bg-emerald-700 hover:bg-emerald-800 text-white py-2 px-4 rounded-lg font-semibold">
            Apply to All New Lanes
          </button>
        </div>

        <button onClick={onClose} className="mt-4 text-sm text-gray-400 hover:text-white underline block text-center">Cancel</button>
      </div>
    </div>
  );
}
