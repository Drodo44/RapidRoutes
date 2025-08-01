// pages/lanes.js

import { useState, useEffect } from "react";
import supabase from "../utils/supabaseClient";
import { suggestComment } from "../lib/commentAI";
import { calculateRRSI } from "../lib/rrsi";
import { saveLaneNote } from "../lib/laneNotes";
import ProtectedRoute from "../components/ProtectedRoute";

function LaneForm() {
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

  const [suggested, setSuggested] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const autoSuggest = () => {
      if (form.equipment && form.origin_state && form.dest_state) {
        const suggestion = suggestComment(form);
        setSuggested(suggestion);
      }
    };
    autoSuggest();
  }, [form.equipment, form.origin_state, form.dest_state]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const rrs = calculateRRSI(form);
    const fullForm = { ...form, rrs };

    const { data, error } = await supabase.from("lanes").insert([fullForm]);

    if (error) {
      setMessage("❌ " + error.message);
    } else {
      setMessage("✅ Lane saved!");
      saveLaneNote(form.origin_city, form.dest_city, form.equipment, form.comment);
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
    <ProtectedRoute>
      <div className="min-h-screen bg-[#111827] flex items-center justify-center py-12 text-white">
        <form
          className="bg-[#1a2236] p-8 rounded-2xl shadow-2xl max-w-xl w-full"
          onSubmit={handleSubmit}
        >
          <h1 className="text-3xl font-bold mb-6 text-neon-blue">Create New Lane</h1>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Origin City</label>
              <input name="origin_city" value={form.origin_city} onChange={handleChange} required className="w-full p-2 rounded bg-[#222f45]" />
            </div>
            <div>
              <label className="block mb-1">Origin State</label>
              <input name="origin_state" value={form.origin_state} onChange={handleChange} required className="w-full p-2 rounded bg-[#222f45]" />
            </div>
            <div>
              <label className="block mb-1">Dest City</label>
              <input name="dest_city" value={form.dest_city} onChange={handleChange} required className="w-full p-2 rounded bg-[#222f45]" />
            </div>
            <div>
              <label className="block mb-1">Dest State</label>
              <input name="dest_state" value={form.dest_state} onChange={handleChange} required className="w-full p-2 rounded bg-[#222f45]" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block mb-1">Equipment</label>
            <input name="equipment" value={form.equipment} onChange={handleChange} required className="w-full p-2 rounded bg-[#222f45]" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Weight (lbs)</label>
              <input name="weight" type="number" value={form.weight} onChange={handleChange} required className="w-full p-2 rounded bg-[#222f45]" />
            </div>
            <div>
              <label className="block mb-1">Length (ft)</label>
              <input name="length" type="number" value={form.length} onChange={handleChange} required className="w-full p-2 rounded bg-[#222f45]" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block mb-1">Pickup Date</label>
            <input name="date" type="date" value={form.date} onChange={handleChange} required className="w-full p-2 rounded bg-[#222f45]" />
          </div>

          <div className="mt-4">
            <label className="block mb-1">Comment (optional)</label>
            <textarea name="comment" value={form.comment} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45]" />
            {suggested && (
              <p className="text-green-400 text-sm mt-1">💡 Suggested: {suggested}</p>
            )}
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-xl font-bold shadow-xl mt-6">
            {loading ? "Saving..." : "Create Lane"}
          </button>

          {message && (
            <div className="mt-4 text-center font-semibold">
              {message}
            </div>
          )}
        </form>
      </div>
    </ProtectedRoute>
  );
}

export default LaneForm;
