import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import exportDatCsv from "../utils/exportDatCsv";

export default function Lanes() {
  const [form, setForm] = useState({
    origin_city: "",
    origin_state: "",
    dest_city: "",
    dest_state: "",
    equipment: "",
    weight: "",
    date: "",
    length: "",
    comment: "",
  });
  const [message, setMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Saving lane...");
    setDownloadUrl("");

    // Save to Supabase
    const { data, error } = await supabase.from("lanes").insert([form]);
    if (error) {
      setMessage(`Error saving lane: ${error.message}`);
      return;
    }

    // Generate DAT CSV (22 postings per lane)
    setMessage("Generating DAT CSV...");
    try {
      const csvUrl = await exportDatCsv([form]); // Wraps logic for template, ZIPs, random weights, crawls
      setDownloadUrl(csvUrl);
      setMessage("Lane saved and DAT CSV ready!");
    } catch (err) {
      setMessage(`CSV generation failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center py-12">
      <form
        onSubmit={handleSubmit}
        className="bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-xl w-full text-white"
      >
        <h1 className="text-3xl font-bold mb-6 text-cyan-400">Create New Lane</h1>

        <div className="mb-4">
          <label className="block mb-1">Origin City</label>
          <input name="origin_city" required value={form.origin_city} onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Origin State</label>
          <input name="origin_state" required value={form.origin_state} onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Destination City</label>
          <input name="dest_city" required value={form.dest_city} onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Destination State</label>
          <input name="dest_state" required value={form.dest_state} onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Equipment</label>
          <input name="equipment" required value={form.equipment} onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Weight (lbs)</label>
          <input name="weight" type="number" required value={form.weight} onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Pickup Date</label>
          <input name="date" type="date" required value={form.date} onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Length (ft)</label>
          <input name="length" type="number" required value={form.length} onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Comment (Optional)</label>
          <textarea name="comment" value={form.comment} onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
        </div>

        <button type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-xl font-bold shadow-xl mt-4">
          Save Lane & Generate DAT CSV
        </button>

        {message && <p className="mt-4 text-cyan-400">{message}</p>}
        {downloadUrl && (
          <a href={downloadUrl} download
            className="block mt-4 text-green-400 underline text-center">
            Download DAT CSV
          </a>
        )}
      </form>
    </div>
  );
}
