// pages/lanes.js

import { useState } from "react";
import supabase from "../utils/supabaseClient";
import { useRouter } from "next/router";

export default function Lanes() {
  const router = useRouter();
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
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.from("lanes").insert([form]);

    if (error) {
      setMessage("❌ " + error.message);
    } else {
      setMessage("✅ Lane saved!");
      setForm({
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
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center py-12 text-white">
      <form
        className="bg-[#1a2236] p-8 rounded-2xl shadow-2xl max-w-xl w-full"
        onSubmit={handleSubmit}
      >
        <h1 className="text-3xl font-bold mb-6 text-neon-blue">Create New Lane</h1>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Origin City</label>
            <input
              name="origin_city"
              value={form.origin_city}
              onChange={handleChange}
              required
              className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block mb-1">Origin State</label>
            <input
              name="origin_state"
              value={form.origin_state}
              onChange={handleChange}
              required
              className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block mb-1">Dest City</label>
            <input
              name="dest_city"
              value={form.dest_city}
              onChange={handleChange}
              required
              className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block mb-1">Dest State</label>
            <input
              name="dest_state"
              value={form.dest_state}
              onChange={handleChange}
              required
              className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block mb-1">Equipment</label>
          <input
            name="equipment"
            value={form.equipment}
            onChange={handleChange}
            required
            className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Weight (lbs)</label>
            <input
              name="weight"
              type="number"
              value={form.weight}
              onChange={handleChange}
              required
              className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="block mb-1">Length (ft)</label>
            <input
              name="length"
              type="number"
              value={form.length}
              onChange={handleChange}
              required
