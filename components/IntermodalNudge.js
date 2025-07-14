// components/IntermodalNudge.js
import { useEffect } from "react";

export default function IntermodalNudge({ lane, onClose, onEmail }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = "auto");
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-[#1a2236] text-white p-8 rounded-2xl shadow-2xl max-w-lg w-full text-center border border-blue-500">
        <h2 className="text-2xl font-bold text-neon-blue mb-4">
          🚄 Intermodal Opportunity
        </h2>
        <p className="mb-6 text-gray-300">
          This lane may be a great fit for Intermodal. You're within range of
          ramps and meet typical rail criteria. Want to check with a partner
          before posting as truckload?
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
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-xl text-white font-semibold"
          >
            Generate Email to Intermodal Partner
          </button>
        </div>
      </div>
    </div>
  );
}

