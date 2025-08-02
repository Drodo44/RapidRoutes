import { useState } from "react";

export default function FloorSpaceCalculator() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [result, setResult] = useState("");

  const calculate = () => {
    const len = parseFloat(length);
    if (isNaN(len)) return setResult("Invalid input");

    if (len <= 26) {
      setResult("✅ Fits in a 26ft box truck.");
    } else if (len <= 53) {
      setResult("⚠️ Requires full-size dry van.");
    } else {
      setResult("❌ Too long. Custom equipment needed.");
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl shadow-xl">
      <h2 className="text-lg font-bold text-cyan-400 mb-2">
        Floor Space Checker
      </h2>
      <div className="space-y-2">
        <input
          type="number"
          placeholder="Length (ft)"
          className="w-full p-2 rounded bg-gray-800 text-white"
          value={length}
          onChange={(e) => setLength(e.target.value)}
        />
        <button
          onClick={calculate}
          className="w-full bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg font-semibold"
        >
          Check Fit
        </button>
        <div className="text-white font-semibold mt-2">{result}</div>
      </div>
    </div>
  );
}
