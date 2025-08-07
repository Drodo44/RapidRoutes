// pages/lanes.js
import { useState } from "react";
import { supabase } from "../utils/supabaseClient";
import CityAutocomplete from "../components/CityAutocomplete";
import EquipmentSelect from "../components/EquipmentSelect";

export default function Lanes() {
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    equipment: "",
    weight: "",
    length: "",
    date: "",
    comment: "",
  });
  const [randomizeWeight, setRandomizeWeight] = useState(false);
  const [suggestedComment, setSuggestedComment] = useState("");

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleEquipmentChange = (val) => {
    setForm((f) => ({ ...f, equipment: val.split(" ").pop() }));
  };

  const suggestComment = () => {
    const { origin, destination, equipment } = form;
    if (!origin || !destination || !equipment) return;
    const comment = `Popular ${equipment} route from ${origin} to ${destination} — strong reload lane`;
    setSuggestedComment(comment);
    setForm((f) => ({ ...f, comment }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const weightValue = randomizeWeight
      ? Math.floor(Math.random() * (48000 - 46750 + 1)) + 46750
      : form.weight;
    const { error } = await supabase.from("lanes").insert([
      { ...form, weight: parseInt(weightValue, 10) },
    ]);
    if (error) {
      alert("Error saving lane.");
    } else {
      alert("Lane created!");
      setForm({
        origin: "",
        destination: "",
        equipment: "",
        weight: "",
        length: "",
        date: "",
        comment: "",
      });
      setSuggestedComment("");
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-xl mx-auto bg-[#1a2236] p-8 rounded-2xl shadow-2xl text-white">
        <h1 className="text-3xl font-bold mb-6 text-cyan-400">Create New Lane</h1>

        <form onSubmit={handleSubmit}>
          {/* Origin and destination autocompletes */}
          <label className="block mb-1">Origin City/State</label>
          <CityAutocomplete
            value={form.origin}
            onChange={(val) => setForm((f) => ({ ...f, origin: val }))}
            placeholder="Start typing city…"
          />
          <div className="h-4" />
          <label className="block mb-1">Destination City/State</label>
          <CityAutocomplete
            value={form.destination}
            onChange={(val) => setForm((f) => ({ ...f, destination: val }))}
            placeholder="Start typing city…"
          />
          <div className="h-4" />

          <label className="block mb-1">Equipment (DAT Code)</label>
          <EquipmentSelect
            value={form.equipment}
            onChange={(val) => handleEquipmentChange(val)}
          />
          <div className="h-4" />

          <label className="block mb-1">Weight (lbs)</label>
          <input
            name="weight"
            type="number"
            required={!randomizeWeight}
            value={form.weight}
            onChange={handleChange}
            className="mb-2 w-full p-3 rounded bg-[#222f45] border border-gray-700"
          />
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              checked={randomizeWeight}
              onChange={() => setRandomizeWeight((r) => !r)}
              className="mr-2"
            />
            <span className="text-gray-300 text-sm">
              Randomize weight 46,750–48,000 lbs
            </span>
          </div>

          <label className="block mb-1">Length (ft)</label>
          <input
            name="length"
            type="number"
            required
            value={form.length}
            onChange={handleChange}
            className="mb-4 w-full p-3 rounded bg-[#222f45] border border-gray-700"
          />

          <label className="block mb-1">Pickup Date</label>
          <input
            name="date"
            type="date"
            required
            value={form.date}
            onChange={handleChange}
            className="mb-4 w-full p-3 rounded bg-[#222f45] border border-gray-700"
          />

          <label className="block mb-1">Comment (Optional)</label>
          <textarea
            name="comment"
            value={form.comment}
            onChange={handleChange}
            className="mb-2 w-full p-3 rounded bg-[#222f45] border border-gray-700"
          />
          {suggestedComment && (
            <div className="mb-4 text-green-400 text-sm">
              Suggested: “{suggestedComment}”
            </div>
          )}
          <button
            type="button"
            onClick={suggestComment}
            className="w-full bg-blue-800 hover:bg-blue-900 py-2 rounded-xl mb-4 font-semibold"
          >
            Suggest DAT Comment
          </button>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 py-2 rounded-xl font-bold"
          >
            Create Lane
          </button>
        </form>
      </div>
    </div>
  );
}
