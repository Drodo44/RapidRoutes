import { useState } from "react";

export default function OversizeChecker() {
  const [dims, setDims] = useState({ length: "", width: "", height: "" });
  const [flag, setFlag] = useState("");

  const check = () => {
    const l = parseFloat(dims.length);
    const w = parseFloat(dims.width);
    const h = parseFloat(dims.height);

    if (l > 53 || w > 8.5 || h > 13.5) {
      setFlag(
        "❗ Oversize load detected. Notify Heavy Haul rep with commodity and dates."
      );
    } else {
      setFlag("✅ Legal dimensions in most states.");
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl shadow-xl">
      <h2 className="text-lg font-bold text-yellow-400 mb-2">
        Oversize Load Checker
      </h2>
      <div className="space-y-2">
        <input
          type="number"
          placeholder="Length (ft)"
          className="w-full p-2 rounded bg-gray-800 text-white"
          onChange={(e) =>
            setDims({ ...dims, length: e.target.value })
          }
        />
        <input
          type="number"
          placeholder="Width (ft)"
          className="w-full p-2 rounded bg-gray-800 text-white"
          onChange={(e) =>
            setDims({ ...dims, width: e.target.value })
          }
        />
        <input
          type="number"
          placeholder="Height (ft)"
          className="w-full p-2 rounded bg-gray-800 text-white"
          onChange={(e) =>
            setDims({ ...dims, height: e.target.value })
          }
        />
        <button
          onClick={check}
          className="w-full bg-yellow-500 hover:bg-yellow-400 px-4 py-2 rounded-lg font-semibold text-black"
        >
          Check Oversize
        </button>
        <div className="text-white font-semibold mt-2">{flag}</div>
      </div>
    </div>
  );
}
