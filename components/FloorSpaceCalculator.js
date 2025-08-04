import { useState } from "react";

export default function FloorSpaceChecker() {
  const [pallets, setPallets] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [stackable, setStackable] = useState(false);
  const [result, setResult] = useState("");

  const calculate = () => {
    const p = Number(pallets);
    const l = Number(length);
    const w = Number(width);
    const trailerWidth = 8.5;
    const perRow = Math.max(1, Math.floor(trailerWidth / w));
    const layers = stackable ? 2 : 1;
    const rows = Math.ceil(p / (perRow * layers));
    const needed = rows * l;
    const message = `Floor Space Required: ${needed.toFixed(1)} ft. ${
      stackable
        ? "Confirm pallets are stackable."
        : "If they are not, you will need a 48' or 53' van."
    }`;
    setResult(message);
  };

  return (
    <div className="bg-[#1B1F28] p-6 rounded-lg border border-gray-700 space-y-4">
      <h2 className="text-white font-semibold text-lg">Floor Space Checker</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <input type="number" placeholder="Pallet Count" value={pallets} onChange={e => setPallets(e.target.value)} className="bg-gray-900 text-white p-2 rounded" />
        <input type="number" placeholder="Length (ft)" value={length} onChange={e => setLength(e.target.value)} className="bg-gray-900 text-white p-2 rounded" />
        <input type="number" placeholder="Width (ft)" value={width} onChange={e => setWidth(e.target.value)} className="bg-gray-900 text-white p-2 rounded" />
        <label className="flex items-center space-x-2 text-gray-300">
          <input type="checkbox" checked={stackable} onChange={() => setStackable(!stackable)} />
          <span>Stackable</span>
        </label>
      </div>
      <button onClick={calculate} className="bg-[#4361EE] hover:bg-blue-700 text-white py-2 px-4 rounded w-full">
        Calculate
      </button>
      {result && <p className="text-gray-200 text-sm mt-2">{result}</p>}
    </div>
  );
}
