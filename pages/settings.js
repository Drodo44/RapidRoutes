import { useState } from "react";

export default function Settings() {
  const [defaultTrailer, setDefaultTrailer] = useState("FD");
  const [contactMethod, setContactMethod] = useState("Email");
  const [minWeight, setMinWeight] = useState(46750);
  const [maxWeight, setMaxWeight] = useState(48000);
  const [enableSmartComments, setEnableSmartComments] = useState(true);

  const handleSave = () => {
    alert("Settings saved! (In production: store to Supabase/user profile)");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white px-4">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-cyan-400">App Settings</h1>

        <label className="block mb-1 text-sm font-medium">Default Trailer</label>
        <select
          value={defaultTrailer}
          onChange={(e) => setDefaultTrailer(e.target.value)}
          className="w-full mb-4 p-3 rounded bg-gray-800"
        >
          <option value="FD">Flatbed/Dry Van (FD)</option>
          <option value="DD">Double Drop (DD)</option>
          <option value="RGN">Removable Gooseneck (RGN)</option>
        </select>

        <label className="block mb-1 text-sm font-medium">Default Contact Method</label>
        <select
          value={contactMethod}
          onChange={(e) => setContactMethod(e.target.value)}
          className="w-full mb-4 p-3 rounded bg-gray-800"
        >
          <option value="Email">Email</option>
          <option value="Primary Phone">Primary Phone</option>
        </select>

        <label className="block mb-1 text-sm font-medium">Weight Randomization Range (lbs)</label>
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            value={minWeight}
            onChange={(e) => setMinWeight(Number(e.target.value))}
            className="w-1/2 p-3 rounded bg-gray-800"
          />
          <input
            type="number"
            value={maxWeight}
            onChange={(e) => setMaxWeight(Number(e.target.value))}
            className="w-1/2 p-3 rounded bg-gray-800"
          />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <input
            type="checkbox"
            checked={enableSmartComments}
            onChange={() => setEnableSmartComments(!enableSmartComments)}
            className="w-5 h-5"
          />
          <label className="text-sm font-medium">Enable AI-generated DAT Comments</label>
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold"
        >
          Save Settings
        </button>
      </div>
    </main>
  );
}
