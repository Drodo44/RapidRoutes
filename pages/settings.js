// pages/settings.js

import { useState } from 'react';

export default function Settings() {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [randomWeight, setRandomWeight] = useState(true);
  const [zipBlocklist, setZipBlocklist] = useState(["30303", "11222"]);
  const [newZip, setNewZip] = useState("");

  const handleAddZip = () => {
    if (newZip && !zipBlocklist.includes(newZip)) {
      setZipBlocklist([...zipBlocklist, newZip]);
      setNewZip("");
    }
  };

  const handleRemoveZip = (zip) => {
    setZipBlocklist(zipBlocklist.filter(z => z !== zip));
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-white flex flex-col items-center py-12">
      <div className="w-full max-w-xl bg-[#1a2236] rounded-2xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-neon-blue mb-6 text-center">Settings</h1>

        <div className="mb-6 flex justify-between items-center">
          <span className="text-lg font-medium text-gray-300">Enable AI Suggestions</span>
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={() => setAiEnabled(!aiEnabled)}
            className="w-6 h-6"
          />
        </div>

        <div className="mb-6 flex justify-between items-center">
          <span className="text-lg font-medium text-gray-300">Randomize Weights</span>
          <input
            type="checkbox"
            checked={randomWeight}
            onChange={() => setRandomWeight(!randomWeight)}
            className="w-6 h-6"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 font-medium mb-2">ZIP Blocklist</label>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newZip}
              onChange={(e) => setNewZip(e.target.value)}
              placeholder="Enter ZIP"
              className="bg-[#222f45] text-white px-3 py-2 rounded w-full"
            />
            <button
              onClick={handleAddZip}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Add
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {zipBlocklist.map((zip, idx) => (
              <div key={idx} className="bg-gray-800 px-3 py-2 rounded flex justify-between items-center">
                <span>{zip}</span>
                <button
                  onClick={() => handleRemoveZip(zip)}
                  className="text-red-400 font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
