import { useState } from "react";
import { checkFitInBoxTruck } from "../lib/floorUtils";

export default function FloorSpaceCalculator() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [count, setCount] = useState("");
  const [result, setResult] = useState(null);

  const handleCheck = () => {
    const fits = checkFitInBoxTruck({ length, width, height, count });
    setResult(fits ? "✅ Fits in 26' box truck" : "❌ Requires full dry van");
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-xl max-w-xl w-full text-white">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Floor Space Calculator</h2>
      <div className="grid grid-cols-2 gap-4">
        <input
          placeholder="Length (in)"
          type="number"
          value={length}
          onChange={(e) => setLength(e.target.value)}
          className="p-2 rounded bg-gray-700"
        />
        <input
          placeholder="Width (in)"
          type="number"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          className="p-2 rounded bg-gray-700"
        />
        <input
          placeholder="Height (in)"
          type="number"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className="p-2 rounded bg-gray-700"
        />
        <input
          placeholder="Total Pallets"
          type="number"
          value={count}
          onChange={(e) => setCount(e.target.value)}
          className="p-2 rounded bg-gray-700"
        />
      </div>
      <button
        onClick={handleCheck}
        className="mt-4 bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded font-bold"
      >
        Check Fit
      </button>
      {result && <p className="mt-4 text-lg font-semibold">{result}</p>}
    </div>
  );
}
