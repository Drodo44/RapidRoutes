// pages/lanes.js
import { useState, useEffect } from "react";
import supabase from "../utils/supabaseClient";
import { calculateRRSI } from "../lib/rrsi";
import { suggestComment } from "../lib/commentAI";
import ProtectedRoute from "../components/ProtectedRoute";
import allCities from "../data/allCities.json"; // assume this exists

function LaneForm() {
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    equipment: "",
    date: "",
    length: "",
    comment: "",
    randomize: false,
    weight: "",
    weightMin: "",
    weightMax: "",
    status: "Active",
  });

  const [aiComment, setAiComment] = useState("");
  const [filteredCities, setFilteredCities] = useState([]);
  const [fieldFocus, setFieldFocus] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (form.equipment && form.origin && form.destination) {
      setAiComment(suggestComment({
        equipment: form.equipment,
        origin_state: form.origin.split(", ")[1],
        dest_state: form.destination.split(", ")[1],
      }));
    }
  }, [form.equipment, form.origin, form.destination]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });

    if (["origin", "destination"].includes(name)) {
      const match = value.toLowerCase();
      const matches = allCities
        .filter(
          (city) =>
            `${city.city}, ${city.state}`.toLowerCase().includes(match)
        )
        .slice(0, 10);
      setFilteredCities(matches);
      setFieldFocus(name);
    }
  };

  const handleCitySelect = (entry) => {
    setForm((prev) => ({
      ...prev,
      [fieldFocus]: `${entry.city}, ${entry.state}`,
    }));
    setFilteredCities([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (
      form.randomize &&
      (!form.weightMin || !form.weightMax || form.weightMin >= form.weightMax)
    ) {
      setMessage("❌ Invalid weight range.");
      return;
    }

    if (!form.randomize && !form.weight) {
      setMessage("❌ Enter a fixed weight or enable randomizer.");
      return;
    }

    const rrs = calculateRRSI(form);

    const laneData = {
      ...form,
      rrs,
    };

    const { error } = await supabase.from("lanes").insert([laneData]);

    if (error) {
      setMessage("❌ " + error.message);
    } else {
      setMessage("✅ Lane added!");
      setForm({
        origin: "",
        destination: "",
        equipment: "",
        date: "",
        length: "",
        comment: "",
        randomize: false,
        weight: "",
        weightMin: "",
        weightMax: "",
        status: "Active",
      });
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#0b1623] text-white py-10 px-4 flex justify-center">
        <form
          onSubmit={handleSubmit}
          className="bg-[#151d2b] p-8 rounded-2xl shadow-2xl w-full max-w-xl"
        >
          <h1 className="text-3xl font-bold text-neon-blue mb-6">
            Create New Lane
          </h1>

          <label className="block mb-1">Origin (City, ST)</label>
          <input
            name="origin"
            value={form.origin}
            onChange={handleChange}
            className="w-full p-2 rounded bg-[#222f45] mb-2"
            required
            autoComplete="off"
          />
          {fieldFocus === "origin" &&
            filteredCities.map((c) => (
              <div
                key={`${c.city},${c.state}`}
                onClick={() => handleCitySelect(c)}
                className="cursor-pointer text-sm px-3 py-1 bg-[#1f2937] hover:bg-[#374151]"
              >
                📍 {c.city}, {c.state}
              </div>
            ))}

          <label className="block mt-4 mb-1">Destination (City, ST)</label>
          <input
            name="destination"
            value={form.destination}
            onChange={handleChange}
            className="w-full p-2 rounded bg-[#222f45] mb-2"
            required
            autoComplete="off"
          />
          {fieldFocus === "destination" &&
            filteredCities.map((c) => (
              <div
                key={`${c.city},${c.state}`}
                onClick={() => handleCitySelect(c)}
                className="cursor-pointer text-sm px-3 py-1 bg-[#1f2937] hover:bg-[#374151]"
              >
                📍 {c.city}, {c.state}
              </div>
            ))}

          <label className="block mt-4 mb-1">Equipment</label>
          <input
            name="equipment"
            value={form.equipment}
            onChange={handleChange}
            className="w-full p-2 rounded bg-[#222f45]"
            required
          />

          <label className="block mt-4 mb-1">Length (ft)</label>
          <input
            name="length"
            type="number"
            value={form.length}
            onChange={handleChange}
            className="w-full p-2 rounded bg-[#222f45]"
            required
          />

          <label className="block mt-4 mb-1">Pickup Date</label>
          <input
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            className="w-full p-2 rounded bg-[#222f45]"
            required
          />

          <div className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              name="randomize"
              checked={form.randomize}
              onChange={handleChange}
            />
            <label className="text-sm">Randomize Weight?</label>
          </div>

          {form.randomize ? (
            <div className="grid grid-cols-2 gap-4 mt-2">
              <input
                name="weightMin"
                type="number"
                placeholder="Min lbs"
                value={form.weightMin}
                onChange={handleChange}
                className="p-2 rounded bg-[#222f45]"
                required
              />
              <input
                name="weightMax"
                type="number"
                placeholder="Max lbs"
                value={form.weightMax}
                onChange={handleChange}
                className="p-2 rounded bg-[#222f45]"
                required
              />
            </div>
          ) : (
            <div className="mt-2">
              <input
                name="weight"
                type="number"
                placeholder="Weight (lbs)"
                value={form.weight}
                onChange={handleChange}
                className="w-full p-2 rounded bg-[#222f45]"
                required
              />
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              name="status"
              checked={form.status === "Queued"}
              onChange={(e) =>
                setForm({ ...form, status: e.target.checked ? "Queued" : "Active" })
              }
            />
            <label className="text-sm">Post Later (Queue)</label>
          </div>

          <label className="block mt-4 mb-1">Comment (Optional)</label>
          <textarea
            name="comment"
            value={form.comment}
            onChange={handleChange}
            className="w-full p-2 rounded bg-[#222f45]"
          />
          {aiComment && (
            <div className="text-green-400 text-sm mt-1">
              💡 Suggestion: {aiComment}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-xl font-bold shadow-xl mt-6"
          >
            Create Lane
          </button>

          {message && (
            <div className="mt-4 text-center font-semibold">{message}</div>
          )}
        </form>
      </div>
    </ProtectedRoute>
  );
}

export default LaneForm;
