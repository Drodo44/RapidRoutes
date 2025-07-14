// pages/lanes.js

import { useState } from "react";
import { isIntermodalCandidate } from "../lib/intermodalAdvisor";
import IntermodalNudge from "../components/IntermodalNudge";

export default function Lanes() {
  const [form, setForm] = useState({
    origin_city: "",
    origin_state: "",
    origin_zip: "",
    dest_city: "",
    dest_state: "",
    dest_zip: "",
    equipment: "",
    weight: "",
    miles: "",
  });

  const [showIntermodalNudge, setShowIntermodalNudge] = useState(false);
  const [selectedLane, setSelectedLane] = useState(null);
  const [showIntermodalEmailModal, setShowIntermodalEmailModal] = useState(false); // placeholder for step 3/12

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();

    // Run Intermodal logic
    if (isIntermodalCandidate(form)) {
      setSelectedLane(form);
      setShowIntermodalNudge(true);
    } else {
      alert("Lane created (placeholder logic)");
    }

    // Reset form
    setForm({
      origin_city: "",
      origin_state: "",
      origin_zip: "",
      dest_city: "",
      dest_state: "",
      dest_zip: "",
      equipment: "",
      weight: "",
      miles: "",
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
          <label className="block mb-1">Origin City</label>
          <input name="origin_city" required value={form.origin_city} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Origin State</label>
          <input name="origin_state" required value={form.origin_state} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Origin ZIP</label>
          <input name="origin_zip" required value={form.origin_zip} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Destination City</label>
          <input name="dest_city" required value={form.dest_city} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Destination State</label>
          <input name="dest_state" required value={form.dest_state} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Destination ZIP</label>
          <input name="dest_zip" required value={form.dest_zip} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Equipment</label>
          <input name="equipment" required value={form.equipment} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>

        <div className="mb-4">
          <label className="block mb-1">Weight (lbs)</label>
          <input name="weight" type="number" required value={form.weight} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>

        <div className="mb-6">
          <label className="block mb-1">Miles</label>
          <input name="miles" type="number" required value={form.miles} onChange={handleChange} className="w-full p-2 rounded bg-[#222f45] border border-gray-700 text-white" />
        </div>

        <button
          className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded-xl font-bold shadow-xl mt-4"
          type="submit"
        >
          Generate Lane
        </button>
      </form>

      {showIntermodalNudge && (
        <IntermodalNudge
          lane={selectedLane}
          onClose={() => setShowIntermodalNudge(false)}
          onEmail={(lane) => {
            setShowIntermodalNudge(false);
            setShowIntermodalEmailModal(true); // Step 3 will hook into this
          }}
        />
      )}
    </div>
  );
}
