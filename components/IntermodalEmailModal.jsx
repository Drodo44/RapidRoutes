// components/IntermodalEmailModal.js
import { useState, useEffect } from "react";
import { generateIntermodalEmail } from "../lib/intermodalAdvisor";

export default function IntermodalEmailModal({ lane, analysis, onClose }) {
  const [form, setForm] = useState({
    origin_city: lane?.origin_city || "",
    origin_state: lane?.origin_state || "",
    origin_zip: lane?.origin_zip || "",
    dest_city: lane?.dest_city || "",
    dest_state: lane?.dest_state || "",
    dest_zip: lane?.dest_zip || "",
    dimensions: "",
    weight: lane?.weight_lbs || "",
    commodity: lane?.commodity || "",
    pickup_date: lane?.pickup_earliest || "",
    special: lane?.comment || "",
    contact_name: "",
    contact_phone: "",
    contact_email: ""
  });

  const [emailText, setEmailText] = useState("");
  const [copied, setCopied] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function generateEmail() {
    // Create enhanced lane object with form data
    const enhancedLane = {
      ...lane,
      ...form,
      weight_lbs: form.weight
    };

    const text = generateIntermodalEmail(enhancedLane, analysis);
    setEmailText(text);
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(emailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }

  useEffect(() => {
    generateEmail();
    // eslint-disable-next-line
  }, [form]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-blue-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-blue-400">
            ✉️ Professional Intermodal Quote Request
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-300 mb-3">Shipment Details</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Pickup City</label>
                <input 
                  name="origin_city" 
                  value={form.origin_city} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Pickup State</label>
                <input 
                  name="origin_state" 
                  value={form.origin_state} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Pickup ZIP</label>
                <input 
                  name="origin_zip" 
                  value={form.origin_zip} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Pickup Date</label>
                <input 
                  name="pickup_date" 
                  type="date"
                  value={form.pickup_date} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Delivery City</label>
                <input 
                  name="dest_city" 
                  value={form.dest_city} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Delivery State</label>
                <input 
                  name="dest_state" 
                  value={form.dest_state} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Delivery ZIP</label>
                <input 
                  name="dest_zip" 
                  value={form.dest_zip} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Weight (lbs)</label>
                <input 
                  name="weight" 
                  type="number"
                  value={form.weight} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Dimensions / Pieces</label>
              <input 
                name="dimensions" 
                placeholder="e.g., 8 pallets, 48x40x55 each"
                value={form.dimensions} 
                onChange={handleChange} 
                className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Commodity</label>
              <input 
                name="commodity" 
                placeholder="e.g., General freight, Electronics, Food products"
                value={form.commodity} 
                onChange={handleChange} 
                className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Special Instructions</label>
              <textarea 
                name="special" 
                placeholder="Any special requirements, timing constraints, or customer specifications"
                value={form.special} 
                onChange={handleChange} 
                rows="3"
                className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
              />
            </div>

            <h3 className="text-lg font-semibold text-gray-300 mb-3 mt-6">Contact Information</h3>
            
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Your Name</label>
                <input 
                  name="contact_name" 
                  placeholder="Your name"
                  value={form.contact_name} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Phone Number</label>
                <input 
                  name="contact_phone" 
                  placeholder="Your phone number"
                  value={form.contact_phone} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Email Address</label>
                <input 
                  name="contact_email" 
                  type="email"
                  placeholder="Your email address"
                  value={form.contact_email} 
                  onChange={handleChange} 
                  className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-white focus:border-blue-400" 
                />
              </div>
            </div>

            {analysis && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-400 mb-2">💡 Analysis Summary</h4>
                <div className="text-sm text-blue-300 space-y-1">
                  <div>Intermodal Score: <span className="font-semibold">{analysis.score}/100</span></div>
                  {analysis.estimatedSavings && (
                    <div>Estimated Savings: <span className="font-semibold text-green-400">
                      ${analysis.estimatedSavings.savings.toLocaleString()} ({analysis.estimatedSavings.percentage})
                    </span></div>
                  )}
                  {analysis.transitTime && (
                    <div>Rail Transit: <span className="font-semibold">{analysis.transitTime.rail}</span></div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Email Preview Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-300">Email Preview</h3>
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? '✓ Copied!' : '📋 Copy Email'}
              </button>
            </div>

            <textarea
              value={emailText}
              readOnly
              className="w-full h-96 p-3 bg-gray-800 text-gray-300 rounded-xl border border-gray-700 font-mono text-xs leading-relaxed"
              onClick={(e) => e.target.select()}
            />

            <div className="text-xs text-gray-500 space-y-1">
              <p>• Click in the email area to select all text</p>
              <p>• Use the Copy button to copy to clipboard</p>
              <p>• Email includes professional analysis and cost projections</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-xl text-white font-semibold"
          >
            Close
          </button>
          <button
            onClick={copyToClipboard}
            className={`px-6 py-2 rounded-xl font-semibold transition-colors ${
              copied 
                ? 'bg-green-600 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {copied ? '✓ Email Copied!' : 'Copy & Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
