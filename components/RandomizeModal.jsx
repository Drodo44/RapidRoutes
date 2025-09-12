import { useState } from "react";

export default function RandomizeModal({ show, onClose, apply }) {
  const [min, setMin] = useState(46750);
  const [max, setMax] = useState(48000);
  const [all, setAll] = useState(false);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30">
      <div className="w-full max-w-sm bg-[#1E222B] p-6 rounded-xl border border-gray-700 space-y-4">
        <h3 className="text-lg font-semibold text-white">Randomize Weight</h3>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            value={min}
            onChange={(e) => setMin(e.target.value)}
            placeholder="Min lbs"
            className="px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm"
          />
          <input
            type="number"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="Max lbs"
            className="px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-white">
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
            className="h-4 w-4"
          />
          Apply to all lanes
        </label>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded bg-gray-600 hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              apply(Number(min), Number(max), all);
              onClose();
            }}
            className="px-4 py-2 text-sm rounded bg-[#4361EE] hover:bg-[#364db9]"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
