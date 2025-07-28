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
          <label className="block mb-1">Destination
