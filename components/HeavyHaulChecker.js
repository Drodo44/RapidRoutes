// components/HeavyHaulChecker.js
import { useState } from "react";

export default function HeavyHaulChecker() {
  const [stateRoute, setStateRoute] = useState("");
  const [commodity, setCommodity] = useState("");
  const [value, setValue] = useState("");
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [showEmail, setShowEmail] = useState(false);

  const triggerAlert = () => {
    if (stateRoute) setShowEmail(true);
  };

  const template = `
Subject: Oversize Load Permit Request – ${stateRoute}

Hello,

I am requesting routing and permit information for a potential heavy haul load through ${stateRoute}.

Details:
- Commodity: ${commodity}
- Load Value: $${value}
- Pickup Date: ${pickup}
- Delivery Date: ${delivery}

Please advise on requirements or special handling.

Thank you.
`;

  return (
    <div className="bg-[#1a2236] p-6 rounded-2xl shadow-xl max-w-3xl mx-auto mt-10 text-white">
      <h2 className="text-2xl font-bold text-cyan-400 mb-4">Heavy Haul Compliance Checker</h2>
      <div className="grid grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="State or Route"
          value={stateRoute}
          onChange={(e) => setStateRoute(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-600"
        />
        <input
          type="text"
          placeholder="Commodity"
          value={commodity}
          onChange={(e) => setCommodity(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-600"
        />
        <input
          type="number"
          placeholder="Load Value ($)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-600"
        />
        <input
          type="text"
          placeholder="Pickup Date"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-600"
        />
        <input
          type="text"
          placeholder="Delivery Date"
          value={delivery}
          onChange={(e) => setDelivery(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-600"
        />
      </div>
      <button
        onClick={triggerAlert}
        className="mt-6 w-full bg-red-600 hover:bg-red-700 py-2 px-4 rounded-xl font-semibold"
      >
        Check Route & Generate Email
      </button>

      {showEmail && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Email Template</h3>
          <textarea
            readOnly
            value={template.trim()}
            className="w-full h-48 p-3 rounded bg-gray-900 border border-gray-700 text-white font-mono"
          />
        </div>
      )}
    </div>
  );
}
