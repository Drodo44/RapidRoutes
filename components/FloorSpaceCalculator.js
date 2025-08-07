// components/FloorSpaceCalculator.js
import { useState } from "react";

export default function FloorSpaceCalculator() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [result, setResult] = useState("");

  const calculateFit = () => {
    const inchesPerFoot = 12;
    const palletLength = parseInt(length);
    const palletWidth = parseInt(width);

    const totalLengthFt = palletLength / inchesPerFoot;

    if (!palletLength || !palletWidth || !height) {
      setResult("Please fill all fields.");
      return;
    }

    if (totalLengthFt <= 26) {
      setResult("✅ Fits in 26ft Box Truck or Larger");
    } else if (totalLengthFt <= 53) {
      setResult("✅ Fits in 53ft Dry Van Only");
    } else {
      setResult("❌ Load Exceeds Dry Van Size — Oversize or Permit Required");
    }
  };

  return (
    <div className="bg-[#1a2236] p-6 rounded-2xl shadow-xl max-w-lg mx-auto mb-10 text-white">
      <h2 className="text-2xl font-bold text-cyan-400 mb-4">Floor Space Calculator</h2>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <input
          type="number"
          placeholder="Length (in)"
          value={length}
          onChange={(e) => setLength(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-600"
        />
        <input
          type="number"
          placeholder="Width (in)"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-600"
        />
        <input
          type="number"
          placeholder="Height (in)"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-600"
        />
      </div>
      <button
        onClick={calculateFit}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl font-semibold w-full"
      >
        Check Fit
      </button>
      {result && <p className="mt-4 font-semibold text-center">{result}</p>}
    </div>
  );
}
