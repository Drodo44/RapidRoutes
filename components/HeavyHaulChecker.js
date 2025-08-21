// components/HeavyHaulChecker.js
import { useState, useEffect } from "react";

// Define state permit offices and special requirements
const statePermitInfo = {
  "AL": { office: "Alabama DOT Permit Office", email: "permits@dot.alabama.gov", phone: "(334) 244-6385" },
  "AZ": { office: "Arizona DOT Overdimensional Permits", email: "permits@azdot.gov", phone: "(602) 712-8160" },
  "CA": { office: "Caltrans Transportation Permits", email: "oversize@dot.ca.gov", phone: "(916) 322-1297", specialReq: "Escort vehicles required for loads exceeding 14' wide" },
  "FL": { office: "Florida DOT Permit Office", email: "permits@fdot.gov", phone: "(850) 410-5777", specialReq: "Nighttime travel restrictions for loads over 12' wide" },
  "IL": { office: "Illinois DOT Permits Section", email: "dot.permits@illinois.gov", phone: "(217) 782-6271" },
  "NY": { office: "NYSDOT Oversize/Overweight Permits", email: "permits@dot.ny.gov", phone: "(518) 485-2999", specialReq: "NYC has separate permit requirements" },
  "OH": { office: "Ohio DOT Special Hauling Permits", email: "permits@dot.ohio.gov", phone: "(614) 351-2300" },
  "PA": { office: "PennDOT Central Permits Office", email: "penndotpermits@pa.gov", phone: "(717) 783-5102" },
  "TX": { office: "TxDOT Motor Carrier Division", email: "mcd-permits@txdot.gov", phone: "(800) 299-1700", specialReq: "Front and rear escort vehicles for loads over 16' wide" },
  "I-5": { office: "Multi-State Corridor Permits", specialReq: "Check with each state DOT along I-5" },
  "I-95": { office: "Eastern Seaboard Corridor", specialReq: "Coordinate with USDOT for multi-state travel" },
};

export default function HeavyHaulChecker() {
  const [stateRoute, setStateRoute] = useState("");
  const [dimensions, setDimensions] = useState({ length: "", width: "", height: "" });
  const [weight, setWeight] = useState("");
  const [commodity, setCommodity] = useState("");
  const [value, setValue] = useState("");
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [permitInfo, setPermitInfo] = useState(null);
  const [isOversize, setIsOversize] = useState(false);
  const [isOverweight, setIsOverweight] = useState(false);

  // Check for oversize/overweight conditions
  useEffect(() => {
    // Standard limits (generalized)
    const standardLimits = {
      width: 102, // 8'6" in inches
      height: 162, // 13'6" in inches
      length: 576, // 48' in inches
      weight: 80000 // 80,000 lbs
    };

    setIsOversize(
      (dimensions.width && Number(dimensions.width) > standardLimits.width) ||
      (dimensions.height && Number(dimensions.height) > standardLimits.height) ||
      (dimensions.length && Number(dimensions.length) > standardLimits.length)
    );

    setIsOverweight(weight && Number(weight) > standardLimits.weight);
  }, [dimensions, weight]);

  const checkPermitRequirements = () => {
    // Find permit info for the entered state/route
    const stateCode = stateRoute.toUpperCase();
    const info = statePermitInfo[stateCode] || {
      office: `${stateRoute} DOT Permit Office`,
      email: `permits@${stateRoute.toLowerCase()}.gov`,
      phone: "Contact local DOT"
    };
    
    setPermitInfo(info);
    setShowEmail(true);
  };

  // Generate email template with permit information
  const template = `
Subject: ${isOversize ? "Oversize" : ""}${isOversize && isOverweight ? "/" : ""}${isOverweight ? "Overweight" : ""} Load Permit Request – ${stateRoute}

Hello${permitInfo?.office ? ` ${permitInfo.office}` : ''},

I am requesting routing and permit information for a ${isOversize ? "oversize" : ""}${isOversize && isOverweight ? "/" : ""}${isOverweight ? "overweight" : ""} load through ${stateRoute}.

Load Details:
- Commodity: ${commodity}
- Dimensions: ${dimensions.length}"L x ${dimensions.width}"W x ${dimensions.height}"H
- Weight: ${weight} lbs
- Value: $${value}
- Pickup Date: ${pickup}
- Delivery Date: ${delivery}

Please advise on permit requirements, fees, and any special handling or escort vehicle requirements for this shipment.

Thank you,
[Your Name]
[Your Company]
[Your Contact Information]
`;

  return (
    <div className="bg-[#1a2236] p-6 rounded-2xl shadow-xl max-w-3xl mx-auto mt-10 text-white">
      <h2 className="text-2xl font-bold text-cyan-400 mb-4">Heavy Haul Compliance Checker</h2>
      
      <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <p className="text-sm">Enter load details below to check permit requirements and generate an email template for contacting the appropriate DOT office.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs mb-1 text-gray-300">State Code or Route (e.g. TX, I-5)</label>
          <input
            type="text"
            value={stateRoute}
            onChange={(e) => setStateRoute(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
          />
        </div>
        
        <div>
          <label className="block text-xs mb-1 text-gray-300">Commodity</label>
          <input
            type="text"
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
          />
        </div>
        
        <div className="md:col-span-2 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs mb-1 text-gray-300">Length (inches)</label>
            <input
              type="number"
              value={dimensions.length}
              onChange={(e) => setDimensions({...dimensions, length: e.target.value})}
              className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-300">Width (inches)</label>
            <input
              type="number"
              value={dimensions.width}
              onChange={(e) => setDimensions({...dimensions, width: e.target.value})}
              className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-300">Height (inches)</label>
            <input
              type="number"
              value={dimensions.height}
              onChange={(e) => setDimensions({...dimensions, height: e.target.value})}
              className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs mb-1 text-gray-300">Weight (lbs)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
          />
        </div>
        
        <div>
          <label className="block text-xs mb-1 text-gray-300">Load Value ($)</label>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
          />
        </div>
        
        <div>
          <label className="block text-xs mb-1 text-gray-300">Pickup Date</label>
          <input
            type="date"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
          />
        </div>
        
        <div>
          <label className="block text-xs mb-1 text-gray-300">Delivery Date</label>
          <input
            type="date"
            value={delivery}
            onChange={(e) => setDelivery(e.target.value)}
            className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
          />
        </div>
      </div>
      
      <div className="mt-2 flex flex-wrap gap-2">
        {isOversize && (
          <span className="px-2 py-1 bg-amber-900/50 border border-amber-700 rounded text-amber-300 text-xs">
            Oversize Load
          </span>
        )}
        {isOverweight && (
          <span className="px-2 py-1 bg-red-900/50 border border-red-700 rounded text-red-300 text-xs">
            Overweight Load
          </span>
        )}
      </div>
      
      <button
        onClick={checkPermitRequirements}
        className="mt-6 w-full bg-red-600 hover:bg-red-700 py-2 px-4 rounded-xl font-semibold"
      >
        Check Permit Requirements & Generate Email
      </button>

      {showEmail && (
        <div className="mt-6">
          {permitInfo && (
            <div className="mb-4 p-4 bg-gray-800 rounded-lg">
              <h3 className="font-semibold mb-2">Permit Office Information:</h3>
              <p><span className="text-gray-400">Office:</span> {permitInfo.office}</p>
              {permitInfo.email && <p><span className="text-gray-400">Email:</span> {permitInfo.email}</p>}
              {permitInfo.phone && <p><span className="text-gray-400">Phone:</span> {permitInfo.phone}</p>}
              {permitInfo.specialReq && (
                <p className="mt-2 text-amber-300 text-sm">{permitInfo.specialReq}</p>
              )}
            </div>
          )}
          
          <h3 className="text-lg font-semibold mb-2">Email Template</h3>
          <textarea
            readOnly
            value={template.trim()}
            className="w-full h-64 p-3 rounded bg-gray-900 border border-gray-700 text-white font-mono"
          />
          <div className="mt-2 text-right">
            <button 
              onClick={() => navigator.clipboard.writeText(template.trim())}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Copy to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
