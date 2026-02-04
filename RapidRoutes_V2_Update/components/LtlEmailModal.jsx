// components/LtlEmailModal.js
import { useState, useEffect } from "react";

export default function LtlEmailModal({ lane, onClose }) {
  const [form, setForm] = useState({
    origin_city: lane?.origin_city || "",
    origin_zip: lane?.origin_zip || "",
    dest_city: lane?.dest_city || "",
    dest_zip: lane?.dest_zip || "",
    pieces: "",
    dimensions: "",
    weight: lane?.weight || "",
    commodity: "",
    special: "",
  });

  const [emailText, setEmailText] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function generateEmail() {
    const text = `
Looking to get a rate for an LTL or Partial shipment on the following:

Pickup City: ${form.origin_city}
Pickup Zip: ${form.origin_zip}
Delivery City: ${form.dest_city}
Delivery Zip: ${form.dest_zip}
Pieces: ${form.pieces}
Dimensions: ${form.dimensions}
Weight: ${form.weight} lbs
Commodity: ${form.commodity}
${form.special ? `Special Instructions: ${form.special}` : ""}

Please advise best rate, service level, and transit time.

Thanks!
`.trim();

    setEmailText(text);
    navigator.clipboard.writeText(text);
  }

  useEffect(() => {
    generateEmail();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-[#1a2236] text-white p-6 rounded-2xl shadow-2xl max-w-2xl w-full relative">
        <h2 className="text-xl font-bold text-yellow-400 mb-4">
          ✉️ Generate Email to LTL / Partial Partner
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <input name="origin_city" placeholder="Pickup City" value={form.origin_city} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <input name="origin_zip" placeholder="Pickup Zip" value={form.origin_zip} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <input name="dest_city" placeholder="Delivery City" value={form.dest_city} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <input name="dest_zip" placeholder="Delivery Zip" value={form.dest_zip} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <input name="pieces" placeholder="Pieces (e.g. 4 skids)" value={form.pieces} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <input name="dimensions" placeholder="Dimensions (e.g. 48x40x60)" value={form.dimensions} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <input name="weight" placeholder="Weight (lbs)" value={form.weight} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <input name="commodity" placeholder="Commodity" value={form.commodity} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <textarea name="special" placeholder="Special Instructions (optional)" value={form.special} onChange={handleChange} className="p-2 rounded bg-[#222f45] col-span-2" />
        </div>

        <div className="flex justify-between items-center mb-4">
          <button
            onClick={generateEmail}
            className="bg-yellow-500 hover:bg-yellow-600 px-5 py-2 rounded-xl text-black font-semibold"
          >
            Generate + Copy Email
          </button>
          <button
            onClick={onClose}
            className="text-sm text-gray-400 hover:text-white"
          >
            Close
          </button>
        </div>

        <textarea
          value={emailText}
          readOnly
          className="w-full h-48 p-3 bg-[#0e1629] text-white rounded-xl border border-yellow-500"
        />
      </div>
    </div>
  );
}
