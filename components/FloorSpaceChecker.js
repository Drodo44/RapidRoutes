import { useState } from "react";

export default function FloorSpaceChecker() {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [stackable, setStackable] = useState(false);

  const calculate = () => {
    const palletLength = 48; // inches
    const palletWidth = 40;
    const truckWidth = 102; // inches
    const boxTruckLengths = [96, 192, 312]; // 8ft, 16ft, 26ft (inches)

    const area = parseInt(length) * parseInt(width);
    const palletArea = palletLength * palletWidth;
    const palletCount = Math.floor(area / palletArea);
    const result = stackable ? palletCount * 2 : palletCount;

    if (parseInt(length) <= 96) return `Fits in cargo van. Est: ${result} pallets`;
    if (parseInt(length) <= 192) return `Fits in 16ft box truck. Est: ${result} pallets`;
    if (parseInt(length) <= 312) return `Fits in 26ft box truck. Est: ${result} pallets`;
    return "Requires full-size truck.";
  };

  return (
    <div className="bg-gray-800 p-4 rounded shadow text-white w-full max-w-md">
      <h2 className="text-lg font-semibold mb-3">Floor Space Calculator</h2>
      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          placeholder="Length (in)"
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
      </div>
      <div className="mt-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={stackable} onChange={() => setStackable(!stackable)} />
          Stackable
        </label>
      </div>
      <div className="mt-4 text-sm text-cyan-300">{length && width ? calculate() : ""}</div>
    </div>
  );
}
