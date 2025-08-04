// pages/lanes.js

import { useState } from "react";
import supabase from "../utils/supabaseClient";
import HeavyHaulPopup from "../components/HeavyHaulPopup";

export default function Lanes() {
  const [form, setForm] = useState({
    originCity: "",
    originState: "",
    originZip: "",
    destCity: "",
    destState: "",
    destZip: "",
    equipment: "",
    weight: "",
    date: "",
    length: "",
    comment: "",
  });
  const [showPopup, setShowPopup] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const isOversize = () => {
    const weight = parseInt(form.weight);
    const length = parseInt(form.length);
    return weight > 48000 || length > 53;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (isOversize()) {
      setShowPopup(true);
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("lanes").insert([form]);
    if (error) alert("Error saving lane.");
    else alert("Lane created!");
    setForm({
      originCity: "",
      originState: "",
      originZip: "",
      destCity: "",
      destState: "",
      destZip: "",
      equipment: "",
      weight: "",
      date: "",
      length: "",
      comment: "",
    });
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center py-12">
      <form
        onSubmit={handleSubmit}
        className="bg-[#1a2236] p-8 rounded-2xl shadow-2xl max-w-2xl w-full text-white"
      >
        <h1 className="text-3xl font-bold mb-6 text-neon-blue">Add New Lane</h1>
        <div className="grid grid-cols-2 gap-4">
          <input name="originCity" placeholder="Origin City" required value={form.originCity} onChange={handleChange} className="input" />
          <input name="originState" placeholder="Origin State" required value={form.originState} onChange={handleChange} className="input" />
          <input name="originZip" placeholder="Origin ZIP" required value={form.originZip} onChange={handleChange} className="input" />
          <input name="destCity" placeholder="Dest City" required value={form.destCity} onChange={handleChange} className="input" />
          <input name="destState" placeholder="Dest State" required value={form.destState} onChange={handleChange} className="input" />
          <input name="destZip" placeholder="Dest ZIP" required value={form.destZip} onChange={handleChange} className="input" />
          <input name="equipment" placeholder="Equipment" required value={form.equipment} onChange={handleChange} className="input" />
          <input name="weight" type="number" placeholder="Weight (lbs)" required value={form.weight} onChange={handleChange} className="input" />
          <input name="length" type="number" placeholder="Length (ft)" required value={form.length} onChange={handleChange} className="input" />
          <input name="date" type="date" required value={form.date} onChange={handleChange} className="input" />
        </div>
        <textarea
          name="comment"
          placeholder="Comment (optional)"
          value={form.comment}
          onChange={handleChange}
          className="w-full mt-4 bg-[#222f45] rounded p-3"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold mt-4"
          disabled={saving}
        >
          {saving ? "Saving..." : "Submit Lane"}
        </button>
      </form>
      <HeavyHaulPopup isOpen={showPopup} onClose={() => setShowPopup(false)} />
    </div>
  );
}
