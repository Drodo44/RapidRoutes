// components/IntermodalEmailModal.js
import { useState, useEffect } from "react";

export default function IntermodalEmailModal({ lane, onClose }) {
  const [form, setForm] = useState({
    origin_city: lane?.origin_city || "",
    origin_zip: lane?.origin_zip || "",
    dest_city: lane?.dest_city || "",
    dest_zip: lane?.dest_zip || "",
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
I'm looking for a quote for a lane to determine if Intermodal is better than FTL. Details below:

Pickup City: ${form.origin_city}
Pickup Zip: ${form.origin_zip}
Delivery City: ${form.dest_city}
Delivery Zip: ${form.dest_zip}
Dimensions: ${form.dimensions}
Weight: ${form.weight} lbs
Commodity: ${form.commodity}
${form.special ? `Special Instructions: ${form.special}` : ""}

Please advise rate, transit time, and available pickup date.

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
        <h2 className="text-xl font-bold text-neon-blue mb-4">
          ✉️ Generate Email to Intermodal Partner
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <input name="origin_city" placeholder="Pickup City" value={form.origin_city} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <input name="origin_zip" placeholder="Pickup Zip" value={form.origin_zip} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <input name="dest_city" placeholder="Delivery City" value={form.dest_city} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <input name="dest_zip" placeholder="Delivery Zip" value={form.dest_zip} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <input name="dimensions" placeholder="Dimensions (e.g. 8 skids, 48x40x55)" value={form.dimensions} onChange={handleChange} className="p-2 rounded bg-[#222f45] col-span-2" />
          <input name="weight" placeholder="Weight (lbs)" value={form.weight} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <input name="commodity" placeholder="Commodity" value={form.commodity} onChange={handleChange} className="p-2 rounded bg-[#222f45]" />
          <textarea name="special" placeholder="Special Instructions (optional)" value={form.special} onChange={handleChange} className="p-2 rounded bg-[#222f45] col-span-2" />
        </div>

        <div className="flex justify-between items-center mb-4">
          <button
            onClick={generateEmail}
            className="bg-green-600 hover:bg-green-700 px-5 py-2 rounded-xl text-white font-semibold"
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
          className="w-full h-48 p-3 bg-[#0e1629] text-white rounded-xl border border-blue-700"
        />
      </div>
    </div>
  );
}
