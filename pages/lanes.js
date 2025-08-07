// pages/lanes.js
import { useState } from "react";
import supabase from "../utils/supabaseClient";

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const suggestComment = () => {
    const { origin, destination, equipment } = form;
    if (!origin || !destination || !equipment) return;

    const comment = `Popular ${equipment} route from ${origin} to ${destination} — strong reload lane`;
    setSuggestedComment(comment);
    setForm((prev) => ({ ...prev, comment }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const weightValue = randomizeWeight
      ? Math.floor(Math.random() * (48000 - 46750 + 1)) + 46750
      : form.weight;

    const { error } = await supabase.from("lanes").insert([
      {
        ...form,
        weight: parseInt(weightValue),
      },
    ]);

    if (!error) {
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
    } else {
      alert("Error saving lane.");
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] flex items-center justify-center py-12">
      <form
        className="bg-[#1a2236] p-8 rounded-2xl shadow-2xl max-w-xl w-full text-white"
        onSubmit={handleSubmit}
      >
        <h1 className="text-3xl font-bold mb-6 text-cyan-400">Create New Lane</h1>

        <label className="block mb-1">Origin City/State</label>
        <input
          name="origin"
          required
          value={form.origin}
          onChange={handleChange}
          className="mb-4 w-full p-3 rounded bg-[#222f45] border border-gray-700"
        />

        <label className="block mb-1">Destination City/State</label>
        <input
          name="destination"
          required
          value={form.destination}
          onChange={handleChange}
          className="mb-4 w-full p-3 rounded bg-[#222f45] border border-gray-700"
        />

        <label className="block mb-1">Equipment Code (e.g. FD)</label>
        <input
          name="equipment"
          required
          value={form.equipment}
          onChange={handleChange}
          className="mb-4 w-full p-3 rounded bg-[#222f45] border border-gray-700"
        />

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
            id="random"
            type="checkbox"
            checked={randomizeWeight}
            onChange={() => setRandomizeWeight(!randomizeWeight)}
            className="mr-2"
          />
          <label htmlFor="random" className="text-sm text-gray-300">
            Randomize weight between 46,750–48,000 lbs
          </label>
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
          className="w-full bg-blue-800 hover:bg-blue-900 py-2 rounded-xl font-semibold mb-4"
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
  );
}
