// components/LtlNudge.js
import { useEffect } from "react";

export default function LtlNudge({ lane, onClose, onEmail }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-[#1a2236] text-white p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-yellow-500">
        <h2 className="text-2xl font-bold text-yellow-400 mb-4">
          📦 LTL / Partial Opportunity
        </h2>
        <p className="mb-6 text-gray-300">
          This lane may be ideal for LTL or Partial. Lower weight or small skid count often
          qualifies for better pricing. Want to generate an email to check with your LTL / Partial Partner?
        </p>
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-xl text-white font-semibold"
          >
            Got It
          </button>
          <button
            onClick={() => onEmail(lane)}
            className="bg-yellow-500 hover:bg-yellow-600 px-6 py-2 rounded-xl text-black font-semibold"
          >
            Generate Email to LTL / Partial Partner
          </button>
        </div>
      </div>
    </div>
  );
}
