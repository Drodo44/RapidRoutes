// components/IntermodalPopup.js
import { useEffect } from "react";

export default function IntermodalPopup({ lane, onClose }) {
  const { originCity, originState, destCity, destState, equipment } = lane;

  const mailBody = encodeURIComponent(
    `Hi Intermodal Team,\n\nCan we move the following lane via rail?\n\nOrigin: ${originCity}, ${originState}\nDestination: ${destCity}, ${destState}\nEquipment: ${equipment}\n\nThanks!\n`
  );

  const mailtoLink = `mailto:intermodal@tql.com?subject=Intermodal Lane Inquiry&body=${mailBody}`;

  useEffect(() => {
    const timeout = setTimeout(onClose, 10000); // auto close after 10s
    return () => clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 bg-gray-900 text-white border border-blue-500 rounded-xl p-4 shadow-2xl z-50 w-96">
      <h2 className="text-lg font-bold mb-2 text-cyan-400">Intermodal Opportunity</h2>
      <p className="text-sm mb-4">
        This lane may be a fit for intermodal. Would you like to email the rail team now?
      </p>
      <div className="flex justify-between">
        <a
          href={mailtoLink}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"
        >
          Email Intermodal Team
        </a>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-sm underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
