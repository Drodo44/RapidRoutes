// pages/settings.js

import { useState } from "react";

export default function Settings() {
  const [defaultTrailer, setDefaultTrailer] = useState("FD");
  const [contactMethod, setContactMethod] = useState("Email");
  const [minWeight, setMinWeight] = useState(46750);
  const [maxWeight, setMaxWeight] = useState(48000);

  const handleSave = () => {
    alert("Settings saved! (In production: write to Supabase or local storage)");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-6">
      <div className="bg-gray-900 p-8 rounded-2xl max-w-md w-full shadow-2xl">
        <h1 className="text-3xl font-bold text-neon-blue mb-6">User Settings</h1>
        <label className="block mb-2 font-medium">Default Trailer</label>
        <select
          value={defaultTrailer}
          onChange={(e) => setDefaultTrailer(e.target.value)}
          className="w-full mb-4 p-2 rounded bg-gray-800"
        >
          <option>FD</option>
          <option>F</option>
          <option>RF</option>
          <option>DD</option>
        </select>

        <label className="block mb-2 font-medium">Contact Method</label>
        <select
          value={contactMethod}
          onChange={(e) => setContactMethod(e.target.value)}
          className="w-full mb-4 p-2 rounded bg-gray-800"
        >
          <option>Email</option>
          <option>Primary Phone</option>
        </select>

        <label className="block mb-2 font-medium">Weight Randomization Range (lbs)</label>
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            value={minWeight}
            onChange={(e) => setMinWeight(Number(e.target.value))}
            className="w-1/2 p-2 rounded bg-gray-800"
          />
          <input
            type="number"
            value={maxWeight}
            onChange={(e) => setMaxWeight(Number(e.target.value))}
            className="w-1/2 p-2 rounded bg-gray-800"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-xl font-bold mt-4"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
