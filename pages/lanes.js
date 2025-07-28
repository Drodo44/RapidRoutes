// /pages/lanes.js
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
  const [showPopup, setShowPopup] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Saving lane...");
    setDownloadUrl("");

    const { error } = await supabase.from("lanes").insert([form]);
    if (error) {
      setMessage(`Error saving lane: ${error.message}`);
      return;
    }

    setShowPopup(true);
  };

  const handleGenerateCsv = async () => {
    setShowPopup(false);
    setMessage("Generating DAT CSV...");
    try {
      const csvUrl = await exportDatCsv([form]);
      setDownloadUrl(csvUrl);
      setMessage("Lane saved and DAT CSV ready!");
    } catch (err) {
      setMessage(`CSV generation failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center py-12">
      <form onSubmit={handleSubmit}
        className="bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-xl w-full text-white">
        <h1 className="text-3xl font-bold mb-6 text-cyan-400">Create New Lane</h1>
        {["origin_city","origin_state","dest_city","dest_state","equipment","weight","date","length"].map((field) => (
          <div key={field} className="mb-4">
            <label className="block mb-1 capitalize">{field.replace("_"," ")}</label>
            <input
              name={field}
              type={field === "weight" || field === "length" ? "number" : field === "date" ? "date" : "text"}
              required value={form[field]} onChange={handleChange}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white"
            />
          </div>
        ))}
        <div className="mb-4">
          <label className="block mb-1">Comment (Optional)</label>
          <textarea name="comment" value={form.comment} onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white" />
        </div>
        <button type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-xl font-bold shadow-xl mt-4">
          Save Lane
        </button>
        {message && <p className="mt-4 text-cyan-400">{message}</p>}
        {downloadUrl && (
          <a href={downloadUrl} download
            className="block mt-4 text-green-400 underline text-center">
            Download DAT CSV
          </a>
        )}
      </form>

      {showPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md text-white">
            <h2 className="text-xl font-bold mb-4">Intermodal Check</h2>
            <p className="mb-6">Would you like to send an email to verify if this lane could move intermodal before posting?</p>
            <div className="flex gap-4">
              <button onClick={() => alert("Email sent (placeholder)")}
                className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded">Send Email</button>
              <button onClick={handleGenerateCsv}
                className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 rounded">Skip & Generate CSV</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
