// components/HeavyHaulPopup.js

import { useState } from "react";

export default function HeavyHaulPopup({ isOpen, onClose }) {
  const [form, setForm] = useState({
    commodity: "",
    value: "",
    pickup: "",
    delivery: "",
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const generateEmail = () => {
    return `
Subject: Oversize Load Request – ${form.commodity}

Hello [Heavy Haul Partner],

We have a new oversize load requiring permits and/or special equipment.

Commodity: ${form.commodity}
Value: $${form.value}
Pickup Date: ${form.pickup}
Delivery Date: ${form.delivery}

Please advise availability and rate ASAP.

Thank you,
RapidRoutes
`.trim();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-[#1a2236] p-8 rounded-xl shadow-xl text-white w-full max-w-lg">
        <h2 className="text-2xl font-bold text-neon-blue mb-4">Oversize Load Details</h2>
        <div className="space-y-3">
          {["commodity", "value", "pickup", "delivery"].map((field) => (
            <input
              key={field}
              name={field}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              value={form[field]}
              onChange={handleChange}
              className="w-full p-3 bg-gray-800 text-white rounded"
            />
          ))}
        </div>
        <textarea
          className="w-full mt-4 p-3 bg-gray-800 rounded"
          value={generateEmail()}
          rows={6}
          readOnly
        />
        <button onClick={onClose} className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-semibold">
          Close
        </button>
      </div>
    </div>
  );
}
