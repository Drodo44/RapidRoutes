import { useState } from "react";

export default function RandomizeWeightPopup({
  onClose,
  setRange,
  setGlobal,
  setRandomize,
  defaultRange,
}) {
  const [min, setMin] = useState(defaultRange.min);
  const [max, setMax] = useState(defaultRange.max);

  const apply = (scope) => {
    setRange({ min, max });
    setGlobal(scope === "all");
    setRandomize(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-[#1a2236] text-white p-6 rounded-xl w-full max-w-md shadow-xl">
        <h2 className="text-xl text-neon-blue font-bold mb-4">Randomize Weight</h2>
        <div className="space-y-3">
          <input
            type="number"
            value={min}
            onChange={(e) => setMin(parseInt(e.target.value))}
            placeholder="Min (lbs)"
            className="input w-full"
          />
          <input
            type="number"
            value={max}
            onChange={(e) => setMax(parseInt(e.target.value))}
            placeholder="Max (lbs)"
            className="input w-full"
          />
        </div>
        <div className="mt-6 flex justify-between gap-3">
          <button
            onClick={() => apply("single")}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold"
          >
            Apply to This Lane
          </button>
          <button
            onClick={() => apply("all")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold"
          >
            Apply to All Lanes
          </button>
        </div>
        <div className="text-right mt-4">
          <button onClick={onClose} className="text-gray-400 hover:underline text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
