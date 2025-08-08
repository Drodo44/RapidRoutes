import { useState } from "react";
import { useRouter } from "next/router";
import supabase from "../../utils/supabaseClient";

/**
 * Admin page for uploading market rate data files.
 *
 * This page allows administrators to upload the latest DAT 30‑day spot and contract
 * matrix CSVs as well as a load‑level history file. The uploaded files are
 * submitted to an API route (`/api/uploadMarketData`) which is responsible for
 * parsing the CSVs and inserting the data into Supabase tables. For now the
 * backend route simply acknowledges receipt; parsing logic will be implemented
 * in a follow‑up update. Only users with an `Admin` role should be able to
 * access this page via the admin dashboard.
 */
export default function MarketDataUpload() {
  const [vanSpotFile, setVanSpotFile] = useState(null);
  const [vanContractFile, setVanContractFile] = useState(null);
  const [reeferSpotFile, setReeferSpotFile] = useState(null);
  const [reeferContractFile, setReeferContractFile] = useState(null);
  const [flatbedSpotFile, setFlatbedSpotFile] = useState(null);
  const [flatbedContractFile, setFlatbedContractFile] = useState(null);
  const [loadHistoryFile, setLoadHistoryFile] = useState(null);
  const [status, setStatus] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("Uploading...");

    try {
      const formData = new FormData();
      if (vanSpotFile) formData.append("vanSpot", vanSpotFile);
      if (vanContractFile) formData.append("vanContract", vanContractFile);
      if (reeferSpotFile) formData.append("reeferSpot", reeferSpotFile);
      if (reeferContractFile) formData.append(
        "reeferContract",
        reeferContractFile
      );
      if (flatbedSpotFile) formData.append("flatbedSpot", flatbedSpotFile);
      if (flatbedContractFile)
        formData.append("flatbedContract", flatbedContractFile);
      if (loadHistoryFile) formData.append("loadHistory", loadHistoryFile);

      const res = await fetch("/api/uploadMarketData", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setStatus("Upload successful");
      } else {
        const text = await res.text();
        setStatus(`Upload failed: ${text}`);
      }
    } catch (err) {
      setStatus(`Upload error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-10">
      <h1 className="text-3xl font-bold mb-6 text-cyan-400 text-center">
        Market Data Upload
      </h1>
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto bg-[#1a2437] p-6 rounded-xl shadow-2xl space-y-4"
      >
        <div>
          <label className="block mb-2 font-semibold">Van Spot Rates (CSV)</label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setVanSpotFile(e.target.files[0] || null)}
            className="w-full bg-gray-800 p-2 rounded border border-gray-700"
          />
        </div>
        <div>
          <label className="block mb-2 font-semibold">
            Van Contract Rates (CSV)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setVanContractFile(e.target.files[0] || null)}
            className="w-full bg-gray-800 p-2 rounded border border-gray-700"
          />
        </div>
        <div>
          <label className="block mb-2 font-semibold">
            Reefer Spot Rates (CSV)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setReeferSpotFile(e.target.files[0] || null)}
            className="w-full bg-gray-800 p-2 rounded border border-gray-700"
          />
        </div>
        <div>
          <label className="block mb-2 font-semibold">
            Reefer Contract Rates (CSV)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setReeferContractFile(e.target.files[0] || null)}
            className="w-full bg-gray-800 p-2 rounded border border-gray-700"
          />
        </div>
        <div>
          <label className="block mb-2 font-semibold">
            Flatbed Spot Rates (CSV)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFlatbedSpotFile(e.target.files[0] || null)}
            className="w-full bg-gray-800 p-2 rounded border border-gray-700"
          />
        </div>
        <div>
          <label className="block mb-2 font-semibold">
            Flatbed Contract Rates (CSV)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFlatbedContractFile(e.target.files[0] || null)}
            className="w-full bg-gray-800 p-2 rounded border border-gray-700"
          />
        </div>
        <div>
          <label className="block mb-2 font-semibold">
            Load‑level History (CSV)
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setLoadHistoryFile(e.target.files[0] || null)}
            className="w-full bg-gray-800 p-2 rounded border border-gray-700"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2 px-4 rounded-lg font-semibold"
        >
          Upload Files
        </button>
        {status && <p className="text-center text-sm text-cyan-400 mt-2">{status}</p>}
      </form>
    </div>
  );
}