// components/HeavyHaulChecker.js
import { useState, useEffect } from "react";
import { STATE_PERMIT_REQUIREMENTS, getRoutePermitRequirements } from "../lib/comprehensiveStatePermits";

export default function HeavyHaulChecker() {
  const [originState, setOriginState] = useState("");
  const [destState, setDestState] = useState("");
  const [dimensions, setDimensions] = useState({ length: "", width: "", height: "" });
  const [weight, setWeight] = useState("");
  const [commodity, setCommodity] = useState("");
  const [value, setValue] = useState("");
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [carrier, setCarrier] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [routeAnalysis, setRouteAnalysis] = useState(null);
  const [isOversize, setIsOversize] = useState(false);
  const [isOverweight, setIsOverweight] = useState(false);

  // Check for oversize/overweight conditions
  useEffect(() => {
    const standardLimits = {
      width: 102, // 8'6" in inches
      height: 162, // 13'6" in inches
      length: 636, // 53' in inches
      weight: 80000 // 80,000 lbs
    };

    setIsOversize(
      (dimensions.width && Number(dimensions.width) > standardLimits.width) ||
      (dimensions.height && Number(dimensions.height) > standardLimits.height) ||
      (dimensions.length && Number(dimensions.length) > standardLimits.length)
    );

    setIsOverweight(weight && Number(weight) > standardLimits.weight);
  }, [dimensions, weight]);

  const analyzeRoute = () => {
    if (!originState || !destState) {
      alert("Please select both origin and destination states");
      return;
    }

    const analysis = getRoutePermitRequirements(
      originState,
      destState,
      {
        width: Number(dimensions.width) || 0,
        height: Number(dimensions.height) || 0,
        length: Number(dimensions.length) || 0
      },
      Number(weight) || 0
    );

    setRouteAnalysis(analysis);
    setShowResults(true);
  };

  const generateComprehensiveEmail = (stateInfo) => {
    return `Subject: Oversize/Overweight Load Permit Request - ${stateInfo.name}

Dear ${stateInfo.office},

I am requesting permit information for an oversize/overweight load traveling through ${stateInfo.name}.

LOAD DETAILS:
• Commodity: ${commodity || 'Not specified'}
• Dimensions: ${dimensions.length || '0'}"L x ${dimensions.width || '0'}"W x ${dimensions.height || '0'}"H
• Weight: ${weight || '0'} lbs
• Load Value: $${value || 'Not specified'}
• Carrier: ${carrier || 'Not specified'}

TRAVEL DATES:
• Pickup Date: ${pickup || 'TBD'}
• Delivery Date: ${delivery || 'TBD'}

PERMIT REQUIREMENTS NEEDED:
${stateInfo.permitNeeded?.required ? 
  `• Permit required due to: ${stateInfo.permitNeeded.reasons.join(', ')}` : 
  '• Standard permit may not be required, but confirming compliance'}

SPECIFIC QUESTIONS:
1. What permits are required for this load?
2. What are the permit fees?
3. Are escort vehicles required?
4. What are the travel time restrictions?
5. Are there specific route requirements?
6. What is the processing time for permits?

Please provide routing guidance and any special requirements for this shipment.

Contact Information:
[Your Name]
[Your Company]
[Phone Number]
[Email Address]

Thank you for your assistance.

Best regards,
[Your Signature]`;
  };

  const stateOptions = Object.keys(STATE_PERMIT_REQUIREMENTS).sort();

  return (
    <div className="bg-[#1a2236] p-6 rounded-2xl shadow-xl max-w-5xl mx-auto mt-10 text-white">
      <h2 className="text-3xl font-bold text-cyan-400 mb-6">Professional Heavy Haul Route Analyzer</h2>
      
      <div className="mb-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <p className="text-sm">Comprehensive permit analysis for oversize/overweight loads across state lines. Get detailed permit requirements, contact information, and professional email templates.</p>
      </div>
      
      {/* Route Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-green-400">Route Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1 text-gray-300">Origin State</label>
              <select
                value={originState}
                onChange={(e) => setOriginState(e.target.value)}
                className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
              >
                <option value="">Select State</option>
                {stateOptions.map(state => (
                  <option key={state} value={state}>{state} - {STATE_PERMIT_REQUIREMENTS[state].name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-300">Destination State</label>
              <select
                value={destState}
                onChange={(e) => setDestState(e.target.value)}
                className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
              >
                <option value="">Select State</option>
                {stateOptions.map(state => (
                  <option key={state} value={state}>{state} - {STATE_PERMIT_REQUIREMENTS[state].name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-orange-400">Load Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1 text-gray-300">Weight (lbs)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
                placeholder="80000"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-300">Commodity</label>
              <input
                type="text"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
                placeholder="Construction Equipment"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div className="bg-gray-800/50 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-3 text-purple-400">Dimensions (inches)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs mb-1 text-gray-300">Length</label>
            <input
              type="number"
              value={dimensions.length}
              onChange={(e) => setDimensions({...dimensions, length: e.target.value})}
              className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
              placeholder="636 (53 ft)"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-300">Width</label>
            <input
              type="number"
              value={dimensions.width}
              onChange={(e) => setDimensions({...dimensions, width: e.target.value})}
              className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
              placeholder="102 (8'6&quot;)"
            />
          </div>
          <div>
            <label className="block text-xs mb-1 text-gray-300">Height</label>
            <input
              type="number"
              value={dimensions.height}
              onChange={(e) => setDimensions({...dimensions, height: e.target.value})}
              className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
              placeholder="162 (13'6&quot;)"
            />
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-yellow-400">Shipment Details</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1 text-gray-300">Load Value ($)</label>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
                placeholder="250000"
              />
            </div>
            <div>
              <label className="block text-xs mb-1 text-gray-300">Carrier/Company</label>
              <input
                type="text"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="p-2 rounded bg-gray-800 border border-gray-600 w-full"
                placeholder="ABC Transport Inc."
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-cyan-400">Travel Dates</h3>
          <div className="space-y-3">
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
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mb-6 flex flex-wrap gap-2">
        {isOversize && (
          <span className="px-3 py-1 bg-amber-900/50 border border-amber-700 rounded-full text-amber-300 text-sm">
            ⚠️ Oversize Load
          </span>
        )}
        {isOverweight && (
          <span className="px-3 py-1 bg-red-900/50 border border-red-700 rounded-full text-red-300 text-sm">
            🚨 Overweight Load
          </span>
        )}
        {!isOversize && !isOverweight && (dimensions.width || dimensions.height || dimensions.length || weight) && (
          <span className="px-3 py-1 bg-green-900/50 border border-green-700 rounded-full text-green-300 text-sm">
            ✅ Within Standard Limits
          </span>
        )}
      </div>
      
      <button
        onClick={analyzeRoute}
        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 py-3 px-6 rounded-xl font-semibold text-lg transition-all duration-200"
      >
        Analyze Route & Generate Permit Requirements
      </button>

      {/* Results Section */}
      {showResults && routeAnalysis && (
        <div className="mt-8 space-y-6">
          <h3 className="text-2xl font-bold text-cyan-400">Route Analysis Results</h3>
          
          {routeAnalysis.requirements.map((stateInfo, index) => (
            <div key={stateInfo.state} className="bg-gray-800/70 p-6 rounded-lg">
              <h4 className="text-xl font-semibold mb-4 text-green-400">
                {stateInfo.name} ({stateInfo.state}) Requirements
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold mb-2 text-gray-300">Contact Information</h5>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-400">Office:</span> {stateInfo.office}</p>
                    <p><span className="text-gray-400">Phone:</span> {stateInfo.phone}</p>
                    <p><span className="text-gray-400">Email:</span> {stateInfo.email}</p>
                    <p><span className="text-gray-400">Website:</span> {stateInfo.website}</p>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold mb-2 text-gray-300">Permit Status</h5>
                  {stateInfo.permitNeeded?.required ? (
                    <div className="space-y-2">
                      <p className="text-red-300 font-semibold">🚨 PERMIT REQUIRED</p>
                      <div className="text-sm">
                        <p className="text-gray-400">Reasons:</p>
                        <ul className="list-disc list-inside ml-2">
                          {stateInfo.permitNeeded.reasons.map((reason, i) => (
                            <li key={i} className="text-red-300">{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-green-300 font-semibold">✅ Standard limits compliant</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold mb-2 text-gray-300">Special Requirements</h5>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-400">Escorts:</span> {stateInfo.specialRequirements.escortRequired}</p>
                    <p><span className="text-gray-400">Time Restrictions:</span> {stateInfo.specialRequirements.timeRestrictions}</p>
                    <p><span className="text-gray-400">Route Restrictions:</span> {stateInfo.specialRequirements.routeRestrictions}</p>
                    <p><span className="text-gray-400">Fees:</span> {stateInfo.specialRequirements.fees}</p>
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold mb-2 text-gray-300">Processing Info</h5>
                  <div className="space-y-1 text-sm">
                    <p><span className="text-gray-400">Processing Time:</span> {stateInfo.processingTime}</p>
                    <p><span className="text-gray-400">Notes:</span> {stateInfo.notes}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => {
                    const emailContent = generateComprehensiveEmail(stateInfo);
                    navigator.clipboard.writeText(emailContent);
                    alert(`Email template for ${stateInfo.name} copied to clipboard!`);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-semibold"
                >
                  📧 Generate & Copy Email Template
                </button>
              </div>
            </div>
          ))}

          {routeAnalysis.multiStateConsiderations && (
            <div className="bg-purple-900/30 border border-purple-700 p-6 rounded-lg">
              <h4 className="text-xl font-semibold mb-4 text-purple-400">
                Multi-State Corridor: {routeAnalysis.multiStateConsiderations.name}
              </h4>
              <div className="space-y-2">
                <p><span className="text-gray-400">Coordinator:</span> {routeAnalysis.multiStateConsiderations.coordinator}</p>
                <p><span className="text-gray-400">Phone:</span> {routeAnalysis.multiStateConsiderations.phone}</p>
                <div>
                  <p className="text-gray-400 mb-2">Special Considerations:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    {routeAnalysis.multiStateConsiderations.specialConsiderations.map((consideration, i) => (
                      <li key={i} className="text-yellow-300">{consideration}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
