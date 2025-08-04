import { useState } from 'react';

export default function FloorSpaceChecker() {
  const [pallets, setPallets] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [stackable, setStackable] = useState(false);

  const calcSpace = () => {
    const space = Number(pallets) * Number(length);
    return stackable ? `${space / 2} ft (stacked)` : `${space} ft`;
  };

  return (
    <div className="bg-[#1B1F28] rounded-xl p-6 border border-gray-700 max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-white">Floor Space Calculator</h2>
      <div className="grid grid-cols-2 gap-4">
        <input
          type="number"
          placeholder="Pallet Count"
          className="bg-[#0F1117] border border-gray-600 p-2 rounded text-white"
          value={pallets}
          onChange={(e) => setPallets(e.target.value)}
        />
        <input
          type="number"
          placeholder="Length (ft)"
          className="bg-[#0F1117] border border-gray-600 p-2 rounded text-white"
          value={length}
          onChange={(e) => setLength(e.target.value)}
        />
        <input
          type="number"
          placeholder="Width (in)"
          className="bg-[#0F1117] border border-gray-600 p-2 rounded text-white"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        />
        <input
          type="number"
          placeholder="Height (in)"
          className="bg-[#0F1117] border border-gray-600 p-2 rounded text-white"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <input
          type="checkbox"
          checked={stackable}
          onChange={(e) => setStackable(e.target.checked)}
          className="accent-emerald-500"
        />
        <label className="text-sm text-white">Stackable</label>
      </div>
      <div className="mt-4 text-white">
        Floor Space Required: <strong>{calcSpace()}</strong>
      </div>
    </div>
  );
}
