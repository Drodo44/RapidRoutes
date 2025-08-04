import { useState } from "react";

const permitStates = {
  AL: { length: 85, width: 102, height: 162 },
  AZ: { length: 80, width: 102, height: 162 },
  // Add all 50 states here...
};

export default function HeavyHaulChecker() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [result, setResult] = useState(null);

  const checkOversize = () => {
    const statesTriggered = [];
    for (const state in permitStates) {
      const { length: maxL, width: maxW, height: maxH } = permitStates[state];
      if (
        parseFloat(length) > maxL ||
        parseFloat(width) > maxW ||
        parseFloat(height) > maxH
      ) {
        statesTriggered.push(state);
      }
    }

    if (statesTriggered.length > 0) {
      setResult(`This load may require permits in the following states: ${statesTriggered.join(", ")}`);
    } else {
      setResult("Good to go – no permits required.");
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded shadow text-white w-full max-w-md mt-6">
      <h2 className="text-lg font-semibold mb-3">Heavy Haul Compliance Checker</h2>
      <div className="grid grid-cols-3 gap-3">
        <input
          type="number"
          placeholder="Length (ft)"
          className="p-2 bg-gray-900 rounded"
          value={length}
          onChange={(e) => setLength(e.target.value)}
        />
        <input
          type="number"
          placeholder="Width (in)"
          className="p-2 bg-gray-900 rounded"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        />
        <input
          type="number"
          placeholder="Height (in)"
          className="p-2 bg-gray-900 rounded"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />
      </div>
      <button
        onClick={checkOversize}
        className="mt-4 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-sm"
      >
        Check Compliance
      </button>
      {result && <div className="mt-4 text-sm text-cyan-300">{result}</div>}
    </div>
  );
}
