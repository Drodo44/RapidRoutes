// pages/market-data.js
// Drag/drop upload UI. No Supabase import here, so no path issues.
import { useState } from "react";

export default function MarketDataUpload() {
  const [equipment, setEquipment] = useState("van");
  const [spot, setSpot] = useState(null);
  const [contract, setContract] = useState(null);
  const [flat, setFlat] = useState(null);
  const [status, setStatus] = useState("");

  const upload = async (e) => {
    e.preventDefault();
    setStatus("Uploading…");
    try {
      const [spotText, contractText, flatText] = await Promise.all([
        spot ? spot.text() : null,
        contract ? contract.text() : null,
        flat ? flat.text() : null,
      ]);
      const res = await fetch("/api/uploadMarketData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment,
          spotCsv: spotText,
          contractCsv: contractText,
          flatCsv: flatText,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setStatus("Upload complete.");
    } catch (err) {
      setStatus(`Upload failed: ${err.message}`);
      alert(`Upload failed: ${err.message}`);
    }
  };

  return (
    <main className="mx-auto max-w-3xl p-6 text-gray-100">
      <h1 className="mb-4 text-2xl font-bold">Market Data Upload</h1>
      <form onSubmit={upload} className="rounded-xl border border-gray-700 bg-[#0f1115] p-5">
        <div className="mb-4">
          <label className="mb-1 block text-xs text-gray-400">Equipment</label>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2"
          >
            <option value="van">Van</option>
            <option value="reefer">Reefer</option>
            <option value="flatbed">Flatbed</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs text-gray-400">Spot Matrix CSV</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setSpot(e.target.files[0] || null)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-xs text-gray-400">Contract Matrix CSV (optional)</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setContract(e.target.files[0] || null)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2"
          />
        </div>

        <div className="mb-4">
          <label className="mb-1 block text-xs text-gray-400">Load-level CSV (optional)</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFlat(e.target.files[0] || null)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2"
          />
        </div>

        <button className="w-full rounded-lg bg-cyan-600 p-2 font-semibold hover:bg-cyan-700">
          Upload
        </button>

        {status && <p className="mt-3 text-center text-sm text-gray-300">{status}</p>}
      </form>
    </main>
  );
}
