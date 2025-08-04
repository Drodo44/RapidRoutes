import { useState } from 'react';

export default function FloorSpaceChecker() {
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [stackable, setStackable] = useState(false);
  const [result, setResult] = useState('');

  const calculate = () => {
    const len = parseFloat(length);
    const wid = parseFloat(width);
    if (!len || !wid) return setResult('Enter valid dimensions');

    const sqft = len * wid;
    const capacity = stackable ? sqft * 2 : sqft;

    if (capacity <= 160) {
      setResult('Fits in Sprinter Van');
    } else if (capacity <= 400) {
      setResult('Fits in 26ft Box Truck');
    } else {
      setResult('Requires Full Size Trailer');
    }
  };

  return (
    <div className="bg-gray-800 p-4 rounded shadow-md text-white w-full max-w-md">
      <h2 className="text-lg font-bold mb-3">Floor Space Calculator</h2>
      <input type="number" placeholder="Length (ft)" value={length} onChange={e => setLength(e.target.value)} className="w-full mb-2 p-2 rounded bg-gray-900" />
      <input type="number" placeholder="Width (ft)" value={width} onChange={e => setWidth(e.target.value)} className="w-full mb-2 p-2 rounded bg-gray-900" />
      <label className="inline-flex items-center mb-2">
        <input type="checkbox" checked={stackable} onChange={e => setStackable(e.target.checked)} className="mr-2" />
        Stackable
      </label>
      <button onClick={calculate} className="bg-emerald-600 px-4 py-2 rounded hover:bg-emerald-700 w-full">Calculate</button>
      {result && <p className="mt-3 text-center font-semibold">{result}</p>}
    </div>
  );
}
