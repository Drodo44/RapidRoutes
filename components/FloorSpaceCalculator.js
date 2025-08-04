// components/FloorSpaceChecker.js
import { useState } from "react";

export default function FloorSpaceChecker() {
  const [pallets, setPallets] = useState("");
  const [lengthFt, setLengthFt] = useState("");
  const [widthFt, setWidthFt]   = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [stackable, setStackable] = useState(false);
  const [result, setResult] = useState(null);

  const calculate = () => {
    const p = Number(pallets),
          L = Number(lengthFt),
          W = Number(widthFt);
    if (!p||!L||!W) {
      setResult("Please enter pallet count, length, and width.");
      return;
    }
    // Assume trailer internal width = 8.5 ft
    const trailerWidth = 8.5;
    const perRow = Math.max(1, Math.floor(trailerWidth / W));
    const layers = stackable ? 2 : 1;
    const rowsNeeded = Math.ceil(p / (perRow * layers));
    const spaceNeeded = rowsNeeded * L;
    setResult(
      `Floor Space Required: ${spaceNeeded.toFixed(1)} ft. ` +
      (stackable
        ? "Confirm pallets are stackable."
        : "If they are not stackable, you will need a 48' or 53' van.")
    );
  };

  return (
    <div className="bg-[#1E222B] rounded-lg p-6 space-y-4 border border-gray-800">
      <h2 className="text-white text-lg font-semibold">Floor Space Checker</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm text-gray-300">Pallet Count</label>
          <input
            value={pallets}
            onChange={(e) => setPallets(e.target.value)}
            type="number"
            className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300">Length (ft)</label>
          <input
            value={lengthFt}
            onChange={(e) => setLengthFt(e.target.value)}
            type="number"
            className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300">Width (ft)</label>
          <input
            value={widthFt}
            onChange={(e) => setWidthFt(e.target.value)}
            type="number"
            className="w-full px-3 py-2 rounded bg-[#242933] border border-gray-700 text-sm"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={stackable}
              onChange={() => setStackable(!stackable)}
              className="h-4 w-4"
            />
            Stackable
          </label>
        </div>
      </div>
      <button
        onClick={calculate}
        className="w-full bg-[#4361EE] hover:bg-[#364db9] text-white font-semibold py-2 rounded"
      >
        Calculate
      </button>
      {result && (
        <p className="text-gray-100 text-sm mt-2">{result}</p>
      )}
    </div>
  );
}
