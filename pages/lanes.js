import { useState } from "react";
import supabase from "../utils/supabaseClient";
import Navbar from "../components/Navbar";
import HeavyHaulPopup from "../components/HeavyHaulPopup";
import RandomizeWeightPopup from "../components/RandomizeWeightPopup";
import { equipmentOptions } from "../utils/equipmentOptions";
import { autofillState } from "../utils/autofillCities";

export default function Lanes() {
  const [form, setForm] = useState({
    originCity: "",
    originState: "",
    destCity: "",
    destState: "",
    equipment: "",
    weight: "",
    date: "",
    length: "",
    comment: "",
  });

  const [showHeavyPopup, setShowHeavyPopup] = useState(false);
  const [showWeightPopup, setShowWeightPopup] = useState(false);
  const [randomize, setRandomize] = useState(false);
  const [weightRange, setWeightRange] = useState({ min: 46750, max: 48000 });
  const [applyToAll, setApplyToAll] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let updated = { ...form, [name]: value };

    if (name === "originCity") {
      updated.originState = autofillState(value) || updated.originState;
    } else if (name === "destCity") {
      updated.destState = autofillState(value) || updated.destState;
    }

    setForm(updated);
  };

  const isOversize = () =>
    parseInt(form.weight) > 48000 || parseInt(form.length) > 53;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const weight = randomize
      ? Math.floor(Math.random() * (weightRange.max - weightRange.min + 1)) +
        weightRange.min
      : parseInt(form.weight);

    const payload = { ...form, weight };

    if (isOversize()) {
      setShowHeavyPopup(true);
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("lanes").insert([payload]);
    if (error) alert("Error saving lane.");
    else alert("Lane created!");

    setForm({
      originCity: "",
      originState: "",
      destCity: "",
      destState: "",
      equipment: "",
      weight: "",
      date: "",
      length: "",
      comment: "",
    });

    if (!applyToAll) {
      setRandomize(false);
    }

    setSaving(false);
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-950 text-white py-12 px-4">
        <form
          onSubmit={handleSubmit}
          className="bg-[#1a2236] max-w-xl mx-auto p-8 rounded-2xl shadow-2xl"
        >
          <h1 className="text-3xl font-bold text-cyan-400 mb-6 text-center">Create Lane</h1>
          <div className="grid grid-cols-2 gap-4">
            <input name="originCity" placeholder="Origin City" required value={form.originCity} onChange={handleChange} className="input" />
            <input name="originState" placeholder="Origin State" required value={form.originState} onChange={handleChange} className="input" />
            <input name="destCity" placeholder="Dest City" required value={form.destCity} onChange={handleChange} className="input" />
            <input name="destState" placeholder="Dest State" required value={form.destState} onChange={handleChange} className="input" />
            <select name="equipment" required value={form.equipment} onChange={handleChange} className="input">
              <option value="">Select Equipment</option>
              {equipmentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                name="weight"
                type="number"
                placeholder="Weight"
                disabled={randomize}
                value={form.weight}
                onChange={handleChange}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => setShowWeightPopup(true)}
                className="text-xs px-2 py-1 bg-blue-700 rounded hover:bg-blue-800"
              >
                Randomize
              </button>
            </div>
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

        {showHeavyPopup && <HeavyHaulPopup isOpen={true} onClose={() => setShowHeavyPopup(false)} />}
        {showWeightPopup && (
          <RandomizeWeightPopup
            onClose={() => setShowWeightPopup(false)}
            setRange={setWeightRange}
            setGlobal={setApplyToAll}
            setRandomize={setRandomize}
            defaultRange={weightRange}
          />
        )}
      </main>
    </>
  );
}
