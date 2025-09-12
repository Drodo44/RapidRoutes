import { useState } from "react";

export default function OversizeChecker() {
  const [dims, setDims] = useState({ 
    length: "", 
    width: "", 
    height: "", 
    weight: "" 
  });
  const [analysis, setAnalysis] = useState(null);
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);

  // Standard legal limits for most states
  const STANDARD_LIMITS = {
    length: 53,
    width: 8.5,
    height: 13.5,
    weight: 80000
  };

  // Oversize thresholds that trigger permit requirements
  const OVERSIZE_THRESHOLDS = {
    length: { 
      superload: 75, 
      warning: 60,
      description: "Trailer + load combination"
    },
    width: { 
      superload: 12, 
      warning: 10,
      description: "Widest point of load"
    },
    height: { 
      superload: 15, 
      warning: 14,
      description: "Ground to highest point"
    },
    weight: { 
      superload: 120000, 
      warning: 100000,
      description: "Gross vehicle weight"
    }
  };

  const analyzeLoad = () => {
    const l = parseFloat(dims.length) || 0;
    const w = parseFloat(dims.width) || 0;
    const h = parseFloat(dims.height) || 0;
    const wt = parseFloat(dims.weight) || 0;

    const violations = [];
    const warnings = [];
    const permits = [];
    let classification = "Legal";
    let urgency = "low";

    // Check each dimension
    if (l > STANDARD_LIMITS.length) {
      if (l > OVERSIZE_THRESHOLDS.length.superload) {
        violations.push(`SUPERLOAD: Length ${l}' exceeds ${OVERSIZE_THRESHOLDS.length.superload}' threshold`);
        permits.push("Superload permit required");
        classification = "Superload";
        urgency = "critical";
      } else if (l > OVERSIZE_THRESHOLDS.length.warning) {
        warnings.push(`WARNING: Length ${l}' requires special handling`);
        permits.push("Oversize length permit");
        classification = "Oversize";
        urgency = "high";
      } else {
        violations.push(`Length ${l}' exceeds standard ${STANDARD_LIMITS.length}' limit`);
        permits.push("Basic oversize permit");
        classification = "Oversize";
        urgency = "medium";
      }
    }

    if (w > STANDARD_LIMITS.width) {
      if (w > OVERSIZE_THRESHOLDS.width.superload) {
        violations.push(`SUPERLOAD: Width ${w}' exceeds ${OVERSIZE_THRESHOLDS.width.superload}' threshold`);
        permits.push("Superload width permit");
        classification = "Superload";
        urgency = "critical";
      } else if (w > OVERSIZE_THRESHOLDS.width.warning) {
        warnings.push(`WARNING: Width ${w}' requires pilot cars`);
        permits.push("Wide load permit + pilot cars");
        classification = "Oversize";
        urgency = "high";
      } else {
        violations.push(`Width ${w}' exceeds standard ${STANDARD_LIMITS.width}' limit`);
        permits.push("Wide load permit");
        classification = "Oversize";
        urgency = "medium";
      }
    }

    if (h > STANDARD_LIMITS.height) {
      if (h > OVERSIZE_THRESHOLDS.height.superload) {
        violations.push(`SUPERLOAD: Height ${h}' exceeds ${OVERSIZE_THRESHOLDS.height.superload}' threshold`);
        permits.push("Superload height permit + route survey");
        classification = "Superload";
        urgency = "critical";
      } else if (h > OVERSIZE_THRESHOLDS.height.warning) {
        warnings.push(`WARNING: Height ${h}' requires clearance verification`);
        permits.push("High load permit + route clearance");
        classification = "Oversize";
        urgency = "high";
      } else {
        violations.push(`Height ${h}' exceeds standard ${STANDARD_LIMITS.height}' limit`);
        permits.push("Overheight permit");
        classification = "Oversize";
        urgency = "medium";
      }
    }

    if (wt > STANDARD_LIMITS.weight) {
      if (wt > OVERSIZE_THRESHOLDS.weight.superload) {
        violations.push(`SUPERLOAD: Weight ${wt.toLocaleString()} lbs exceeds ${OVERSIZE_THRESHOLDS.weight.superload.toLocaleString()} lb threshold`);
        permits.push("Superload weight permit + bridge analysis");
        classification = "Superload";
        urgency = "critical";
      } else if (wt > OVERSIZE_THRESHOLDS.weight.warning) {
        warnings.push(`WARNING: Weight ${wt.toLocaleString()} lbs requires weight distribution analysis`);
        permits.push("Overweight permit + axle configuration");
        classification = "Overweight";
        urgency = "high";
      } else {
        violations.push(`Weight ${wt.toLocaleString()} lbs exceeds standard ${STANDARD_LIMITS.weight.toLocaleString()} lb limit`);
        permits.push("Overweight permit");
        classification = "Overweight";
        urgency = "medium";
      }
    }

    // Determine status and recommendations
    let status = "✅ Legal Load";
    let statusColor = "text-green-400";
    let recommendations = [];

    if (violations.length > 0 || warnings.length > 0) {
      if (urgency === "critical") {
        status = "🚨 SUPERLOAD - IMMEDIATE ESCALATION REQUIRED";
        statusColor = "text-red-400";
        recommendations.push("Contact Heavy Haul department immediately");
        recommendations.push("Route engineering required before pricing");
        recommendations.push("Customer must provide detailed load drawings");
      } else if (urgency === "high") {
        status = "⚠️ OVERSIZE - SPECIALIZED HANDLING REQUIRED";
        statusColor = "text-yellow-400";
        recommendations.push("Verify route clearances before commitment");
        recommendations.push("Add permit costs and escort fees to pricing");
        recommendations.push("Confirm pickup/delivery accessibility");
      } else {
        status = "📋 OVERSIZE - PERMIT REQUIRED";
        statusColor = "text-orange-400";
        recommendations.push("Add permit fees to load cost");
        recommendations.push("Allow extra transit time for permits");
        recommendations.push("Verify state-specific requirements");
      }
    } else {
      recommendations.push("Standard legal load - no special permits required");
      recommendations.push("Can proceed with normal booking process");
    }

    setAnalysis({
      classification,
      status,
      statusColor,
      violations,
      warnings,
      permits: [...new Set(permits)], // Remove duplicates
      recommendations,
      urgency,
      dimensions: { l, w, h, wt }
    });
  };

  const generateEmailTemplate = () => {
    if (!analysis) return "";

    const { dimensions, classification, permits, urgency } = analysis;
    const subject = urgency === "critical" 
      ? `URGENT: Superload Inquiry - ${dimensions.l}'L x ${dimensions.w}'W x ${dimensions.h}'H`
      : `${classification} Load Quote Request - ${dimensions.l}'L x ${dimensions.w}'W x ${dimensions.h}'H`;

    return `Subject: ${subject}

Dear Heavy Haul Team,

I have a ${classification.toLowerCase()} load inquiry that requires specialized handling:

LOAD DIMENSIONS:
• Length: ${dimensions.l} feet
• Width: ${dimensions.w} feet  
• Height: ${dimensions.h} feet
• Weight: ${dimensions.wt ? dimensions.wt.toLocaleString() + ' lbs' : 'TBD'}

PERMIT REQUIREMENTS:
${permits.map(permit => `• ${permit}`).join('\n')}

CUSTOMER INFORMATION:
• Shipper: [Customer Name]
• Commodity: [Commodity Description]
• Pickup Date: [Date Range]
• Origin: [City, State]
• Destination: [City, State]

URGENCY LEVEL: ${urgency.toUpperCase()}

${urgency === "critical" ? 
`This is a SUPERLOAD requiring immediate engineering review. Please prioritize for route analysis and permit coordination.` :
`Please provide permit requirements, estimated costs, and transit time for this shipment.`}

Additional Notes:
[Any special requirements, timing constraints, or customer specifications]

Thanks,
[Your Name]
[Contact Information]`;
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl shadow-xl">
      <h2 className="text-lg font-bold text-yellow-400 mb-4">
        Professional Oversize Load Analyzer
      </h2>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        <input
          type="number"
          step="0.1"
          placeholder="Length (ft)"
          className="p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-yellow-400"
          value={dims.length}
          onChange={(e) => setDims({ ...dims, length: e.target.value })}
        />
        <input
          type="number"
          step="0.1" 
          placeholder="Width (ft)"
          className="p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-yellow-400"
          value={dims.width}
          onChange={(e) => setDims({ ...dims, width: e.target.value })}
        />
        <input
          type="number"
          step="0.1"
          placeholder="Height (ft)"
          className="p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-yellow-400"
          value={dims.height}
          onChange={(e) => setDims({ ...dims, height: e.target.value })}
        />
        <input
          type="number"
          placeholder="Weight (lbs)"
          className="p-2 rounded bg-gray-800 text-white border border-gray-700 focus:border-yellow-400"
          value={dims.weight}
          onChange={(e) => setDims({ ...dims, weight: e.target.value })}
        />
      </div>

      <button
        onClick={analyzeLoad}
        className="w-full bg-yellow-500 hover:bg-yellow-400 px-4 py-2 rounded-lg font-semibold text-black mb-4"
      >
        Analyze Load Requirements
      </button>

      {analysis && (
        <div className="space-y-4">
          <div className={`font-bold text-sm ${analysis.statusColor}`}>
            {analysis.status}
          </div>

          {analysis.violations.length > 0 && (
            <div className="bg-red-900/30 border border-red-700 rounded p-3">
              <h4 className="font-semibold text-red-400 mb-2">Violations Detected:</h4>
              <ul className="text-red-300 text-sm space-y-1">
                {analysis.violations.map((violation, idx) => (
                  <li key={idx}>• {violation}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.warnings.length > 0 && (
            <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3">
              <h4 className="font-semibold text-yellow-400 mb-2">Warnings:</h4>
              <ul className="text-yellow-300 text-sm space-y-1">
                {analysis.warnings.map((warning, idx) => (
                  <li key={idx}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {analysis.permits.length > 0 && (
            <div className="bg-blue-900/30 border border-blue-700 rounded p-3">
              <h4 className="font-semibold text-blue-400 mb-2">Required Permits:</h4>
              <ul className="text-blue-300 text-sm space-y-1">
                {analysis.permits.map((permit, idx) => (
                  <li key={idx}>• {permit}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-gray-800 border border-gray-700 rounded p-3">
            <h4 className="font-semibold text-gray-300 mb-2">Recommendations:</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx}>• {rec}</li>
              ))}
            </ul>
          </div>

          {(analysis.violations.length > 0 || analysis.warnings.length > 0) && (
            <button
              onClick={() => setShowEmailTemplate(!showEmailTemplate)}
              className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-semibold text-white"
            >
              {showEmailTemplate ? 'Hide' : 'Generate'} Heavy Haul Email Template
            </button>
          )}

          {showEmailTemplate && (
            <div className="bg-gray-800 border border-gray-700 rounded p-3">
              <h4 className="font-semibold text-gray-300 mb-2">Email Template:</h4>
              <textarea
                className="w-full h-64 p-2 bg-gray-900 text-gray-300 border border-gray-600 rounded text-sm font-mono"
                value={generateEmailTemplate()}
                readOnly
                onClick={(e) => e.target.select()}
              />
              <p className="text-gray-500 text-xs mt-2">Click to select all text, then copy to clipboard</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-xs text-gray-500 border-t border-gray-700 pt-2">
        <p><strong>Standard Limits:</strong> 53'L × 8.5'W × 13.5'H × 80,000 lbs</p>
        <p><strong>Superload Thresholds:</strong> 75'L × 12'W × 15'H × 120,000 lbs</p>
      </div>
    </div>
  );
}
