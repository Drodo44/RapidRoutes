import { useState } from 'react';

const stateLimits = {
  height: 13.6,
  width: 8.6,
  length: 53
};

const heavyHaulStates = ["CA", "TX", "FL", "NY", "PA", "IL", "GA", "NC", "OH", "MI"];

export default function HeavyHaulChecker() {
  const [dims, setDims] = useState({ length: '', width: '', height: '' });
  const [exceeds, setExceeds] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [prompt, setPrompt] = useState('');

  const checkLimits = () => {
    const { length, width, height } = dims;
    const l = parseFloat(length);
    const w = parseFloat(width);
    const h = parseFloat(height);
    if (!l || !w || !h) return;

    if (l > stateLimits.length || w > stateLimits.width || h > stateLimits.height) {
      setExceeds(true);
      setShowPopup(true);
    } else {
      setExceeds(false);
      setPrompt("This load does not require permits.");
    }
  };

  const handleRouteConfirm = (yes) => {
    setShowPopup(false);
    setPrompt(yes
      ? `⚠️ This load may require permits if routing through: ${heavyHaulStates.join(', ')}.\nContact your Heavy Haul Partner.`
      : '✅ Good to go. No permits required.');
  };

  return (
    <div className="bg-gray-800 p-4 rounded text-white w-full max-w-md mt-6 shadow-md">
      <h2 className="text-lg font-bold mb-3">Heavy Haul Checker</h2>
      <input type="number" placeholder="Length (ft)" onChange={e => setDims({ ...dims, length: e.target.value })} className="w-full mb-2 p-2 bg-gray-900 rounded" />
      <input type="number" placeholder="Width (ft)" onChange={e => setDims({ ...dims, width: e.target.value })} className="w-full mb-2 p-2 bg-gray-900 rounded" />
      <input type="number" placeholder="Height (ft)" onChange={e => setDims({ ...dims, height: e.target.value })} className="w-full mb-2 p-2 bg-gray-900 rounded" />
      <button onClick={checkLimits} className="bg-blue-600 hover:bg-blue-700 w-full py-2 rounded">Check</button>

      {showPopup && (
        <div className="bg-gray-700 p-3 mt-4 rounded text-sm">
          <p>This load exceeds legal limits. Route through any of the following?</p>
          <p className="text-amber-300">{heavyHaulStates.join(', ')}</p>
          <div className="flex justify-center gap-3 mt-2">
            <button onClick={() => handleRouteConfirm(true)} className="bg-red-600 px-3 py-1 rounded">Yes</button>
            <button onClick={() => handleRouteConfirm(false)} className="bg-emerald-600 px-3 py-1 rounded">No</button>
          </div>
        </div>
      )}

      {prompt && <p className="mt-4 text-center">{prompt}</p>}
    </div>
  );
}
