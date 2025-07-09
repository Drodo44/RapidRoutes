// pages/lanes.js

import { useState } from "react";

export default function Lanes() {
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    equipment: "",
    weight: "",
    date: "",
    length: "",
    comment: "",
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: Add Supabase/DB integration to actually save the lane
    alert("Lane created!\n" + JSON.stringify(form, null, 2));
    setForm({
      origin: "",
      destination: "",
      equipment: "",
      weight: "",
      date: "",
      length: "",
      comment: "",
    });
  }

  return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center py-12">
      <form
        className="bg-[#1a2236] p-8 rounded-2xl shadow-2xl max-w-xl w-full text-white"
        onSubmit={handleSubmit}
      >
        <h1 className="text-3xl font-bold mb-6 text-neon-blue">Create New Lane</h1>
        <div className="mb-4">
          <label className="block mb-1">Origin City/State</label>
          <input name="origin" required value={form.origin} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Destination City/State</label>
          <input name="destination" required value={form.destination} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Equipment</label>
          <input name="equipment" required value={form.equipment} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Weight</label>
          <input name="weight" type="number" required value={form.weight} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Date</label>
          <input name="date" type="date" required value={form.date} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Length</label>
          <input name="length" type="number" required value={form.length} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>
        <div className="mb-4">
          <label className="block mb-1">Comment (Optional)</label>
          <textarea name="comment" value={form.comment} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>
        <button className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-xl font-bold shadow-xl mt-4" type="submit">
          Create Lane
        </button>
      </form>
    </div>
  );
}
