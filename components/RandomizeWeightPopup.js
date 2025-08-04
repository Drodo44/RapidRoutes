// components/RandomizeWeightPopup.js

import { useState } from "react";

export default function RandomizeWeightPopup({
  onClose,
  setRange,
  setGlobal,
  setRandomize,
  defaultRange,
  defaultGlobal,
}) {
  const [min, setMin] = useState(defaultRange.min);
  const [max, setMax] = useState(defaultRange.max);
  const [global, setGlobalLocal] = useState(defaultGlobal);

  const handleSave = () => {
    if (min > max || min < 40000 || max > 50000) return;
    setRange({ min, max });
    setGlobal(global);
    setRandomize(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#1a2236] text-white p-6 rounded-xl w-full max-w-md shadow-xl">
        <h2 className="text-xl text-neon-blue font-bold mb-4">Randomize Weight</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label>Min (lbs)</label>
            <input
              type="number"
              value={min}
              onChange={(e) => setMin(parseInt(e.target.value))}
              className="input w-32"
            />
          </div>
          <div className="flex justify-between items-center">
            <label>Max (lbs)</label>
            <input
              type="number"
              value={max}
              onChange={(e) => setMax(parseInt(e.target.value))}
              className="input w-32"
            />
          </div>
          <label className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              checked={global}
              onChange={() => setGlobalLocal(!global)}
            />
            <span>Apply to All Lanes Until Unchecked</span>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
