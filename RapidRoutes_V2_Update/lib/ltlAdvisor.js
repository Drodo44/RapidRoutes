// lib/ltlAdvisor.js

// LTL carrier network and service areas
const ltlCarriers = [
  {
    name: "FedEx Freight",
    code: "FXFE", 
    coverage: "National",
    strengths: ["Next-day service", "Time-definite", "Technology"],
    maxWeight: 20000,
    specialties: ["Expedited", "White glove", "Inside delivery"]
  },
  {
    name: "Old Dominion (ODFL)",
    code: "ODFL",
    coverage: "National", 
    strengths: ["Service quality", "Damage-free", "On-time delivery"],
    maxWeight: 15000,
    specialties: ["Premium service", "Residential", "Guaranteed"]
  },
  {
    name: "XPO Logistics",
    code: "XPO",
    coverage: "National",
    strengths: ["Technology", "Last-mile", "Heavy freight"],
    maxWeight: 25000,
    specialties: ["Heavy LTL", "White glove", "Final mile"]
  },
  {
    name: "YRC Freight", 
    code: "YRC",
    coverage: "National",
    strengths: ["Cross-country", "Heavy freight", "Volume"],
    maxWeight: 30000,
    specialties: ["Heavy LTL", "Volume discounts", "Long haul"]
  },
  {
    name: "Estes Express",
    code: "ESTE",
    coverage: "Regional - Southeast/Mid-Atlantic",
    strengths: ["Regional expertise", "Service quality", "Final mile"],
    maxWeight: 16000,
    specialties: ["Regional", "Time-definite", "Residential"]
  },
  {
    name: "Saia LTL",
    code: "SAIA", 
    coverage: "Regional - West/Central",
    strengths: ["Western coverage", "Service quality", "Technology"],
    maxWeight: 15000,
    specialties: ["Regional", "Expedited", "Guaranteed"]
  },
  {
    name: "R+L Carriers",
    code: "RLHF",
    coverage: "National",
    strengths: ["Next-day service", "Regional strength", "Guaranteed"],
    maxWeight: 20000,
    specialties: ["Next-day", "Guaranteed", "Expedited"]
  },
  {
    name: "ABF Freight",
    code: "ABF",
    coverage: "National", 
    strengths: ["Union drivers", "Reliability", "Heavy freight"],
    maxWeight: 28000,
    specialties: ["Heavy LTL", "Reliable service", "Union workforce"]
  }
];

// LTL rate factors and calculations
const ltlFactors = {
  classFactors: {
    50: 1.0,   // Dense, low risk
    55: 1.1,
    60: 1.2,
    65: 1.3,
    70: 1.4,
    77.5: 1.6,
    85: 1.8,
    92.5: 2.0,
    100: 2.2,
    110: 2.5,
    125: 3.0,
    150: 3.5,
    175: 4.0,
    200: 4.5,
    250: 5.0,
    300: 6.0,
    400: 7.0,
    500: 8.0   // Low density, high risk
  },
  weightBreaks: [
    { min: 0, max: 500, factor: 2.0 },
    { min: 501, max: 1000, factor: 1.8 },
    { min: 1001, max: 2000, factor: 1.6 },
    { min: 2001, max: 5000, factor: 1.4 },
    { min: 5001, max: 10000, factor: 1.2 },
    { min: 10001, max: 20000, factor: 1.0 },
    { min: 20001, max: 50000, factor: 0.9 }
  ],
  distanceFactors: {
    0: 1.0,      // Local
    100: 1.2,    // Regional
    300: 1.4,    // Multi-regional  
    500: 1.6,    // Long haul
    1000: 2.0,   // Cross country
    1500: 2.2,   // Coast to coast
    2500: 2.5    // Max distance
  }
};

// Determine freight class based on commodity and density
function estimateFreightClass(commodity, weight, dimensions) {
  const commodityLower = (commodity || '').toLowerCase();
  
  // Common commodity classifications
  const classMap = {
    'machinery': 100,
    'electronics': 92.5,
    'computer': 92.5, 
    'automotive parts': 85,
    'auto parts': 85,
    'clothing': 77.5,
    'textiles': 77.5,
    'furniture': 125,
    'appliances': 85,
    'food': 65,
    'beverages': 60,
    'paper': 92.5,
    'chemicals': 77.5,
    'plastics': 77.5,
    'metal': 70,
    'steel': 70,
    'glass': 85,
    'ceramics': 85,
    'lumber': 70,
    'building materials': 70
  };

  // Check for specific commodity matches
  for (const [key, value] of Object.entries(classMap)) {
    if (commodityLower.includes(key)) {
      return value;
    }
  }

  // Calculate density if dimensions provided
  if (dimensions && weight) {
    // Parse dimensions (assuming format like "48x40x60" or "4 pallets")
    const density = calculateDensity(weight, dimensions);
    return classFromDensity(density);
  }

  // Default to middle class if unknown
  return 92.5;
}

function calculateDensity(weight, dimensions) {
  // Simple density calculation - could be enhanced
  const dimStr = dimensions.toLowerCase();
  
  if (dimStr.includes('pallet') || dimStr.includes('skid')) {
    const palletMatch = dimStr.match(/(\d+)\s*(pallet|skid)/);
    if (palletMatch) {
      const pallets = parseInt(palletMatch[1]);
      const cubicFeet = pallets * 48 * 40 * 60 / 1728; // Standard pallet size
      return weight / cubicFeet;
    }
  }
  
  // Parse dimensions like "48x40x60"
  const dimMatch = dimStr.match(/(\d+)\s*x\s*(\d+)\s*x\s*(\d+)/);
  if (dimMatch) {
    const cubicFeet = (parseInt(dimMatch[1]) * parseInt(dimMatch[2]) * parseInt(dimMatch[3])) / 1728;
    return weight / cubicFeet;
  }
  
  return 8; // Default density
}

function classFromDensity(density) {
  if (density >= 30) return 50;
  if (density >= 22.5) return 55;
  if (density >= 15) return 60;
  if (density >= 13.5) return 65;
  if (density >= 12) return 70;
  if (density >= 10.5) return 77.5;
  if (density >= 9) return 85;
  if (density >= 8) return 92.5;
  if (density >= 7) return 100;
  if (density >= 6) return 110;
  if (density >= 5) return 125;
  if (density >= 4) return 150;
  if (density >= 3) return 175;
  if (density >= 2) return 200;
  if (density >= 1) return 250;
  return 400; // Very low density
}

// Enhanced LTL eligibility checker
export function checkLtlEligibility(lane) {
  try {
    const analysis = {
      eligible: false,
      score: 0,
      factors: {},
      recommendations: [],
      suggestedCarriers: [],
      estimatedClass: null,
      rateEstimate: null
    };

    // Basic validation
    if (!lane.origin_city || !lane.dest_city) {
      return { ...analysis, reason: 'Missing origin or destination information' };
    }

    // Weight analysis
    const weight = parseInt(lane.weight_lbs) || 5000;
    const maxLtlWeight = 20000; // Most carriers
    
    analysis.factors.weight = {
      lbs: weight,
      suitable: weight <= maxLtlWeight,
      score: weight <= maxLtlWeight ? (weight <= 10000 ? 25 : 15) : 0,
      notes: weight <= maxLtlWeight ? 
        (weight <= 10000 ? 'Ideal LTL weight range' : 'Heavy LTL - limited carriers') :
        'Exceeds LTL weight limits - requires truckload'
    };

    // Distance analysis
    const estimatedDistance = estimateDistance(lane.origin_state, lane.dest_state);
    analysis.factors.distance = {
      miles: estimatedDistance,
      suitable: estimatedDistance <= 1500,
      score: estimatedDistance <= 1500 ? (estimatedDistance <= 500 ? 20 : 10) : 0,
      notes: estimatedDistance <= 1500 ?
        (estimatedDistance <= 500 ? 'Excellent for LTL service' : 'Good LTL distance') :
        'Long distance may favor truckload'
    };

    // Equipment analysis
    const equipment = (lane.equipment_code || '').toUpperCase();
    const ltlCompatible = ['V', 'VAN', 'DV', 'BOX', 'LTL'].some(eq => equipment.includes(eq));
    
    analysis.factors.equipment = {
      type: equipment || 'V',
      compatible: ltlCompatible,
      score: ltlCompatible ? 15 : 0,
      notes: ltlCompatible ? 'Compatible with LTL service' : 'Equipment type requires dedicated truck'
    };

    // Commodity analysis
    const commodity = lane.commodity || 'General freight';
    const freightClass = estimateFreightClass(commodity, weight, lane.dimensions);
    analysis.estimatedClass = freightClass;
    
    const classScore = freightClass <= 100 ? 20 : (freightClass <= 200 ? 10 : 0);
    analysis.factors.commodity = {
      description: commodity,
      estimatedClass: freightClass,
      score: classScore,
      notes: freightClass <= 100 ? 'Low freight class - cost effective' :
             freightClass <= 200 ? 'Medium freight class' : 'High freight class - expensive'
    };

    // Urgency analysis
    const hasUrgentKeywords = ['urgent', 'asap', 'rush', 'hot', 'expedite'].some(keyword => 
      (lane.comment?.toLowerCase() || '').includes(keyword)
    );
    
    analysis.factors.timing = {
      urgent: hasUrgentKeywords,
      score: hasUrgentKeywords ? 10 : 20,
      notes: hasUrgentKeywords ? 'Urgent - expedited LTL available' : 'Standard timing suitable for LTL'
    };

    // Accessorial requirements
    const needsSpecialHandling = ['residential', 'inside', 'appointment', 'liftgate', 'freeze protection'].some(req =>
      (lane.comment?.toLowerCase() || '').includes(req)
    );

    analysis.factors.accessorials = {
      required: needsSpecialHandling,
      score: needsSpecialHandling ? 5 : 15,
      notes: needsSpecialHandling ? 'Special services required - additional fees' : 'Standard delivery requirements'
    };

    // Calculate total score
    analysis.score = Object.values(analysis.factors).reduce((sum, factor) => sum + factor.score, 0);

    // Determine eligibility
    analysis.eligible = analysis.score >= 60;

    // Generate recommendations
    if (analysis.eligible) {
      analysis.recommendations.push('✅ Good candidate for LTL service');
      analysis.recommendations.push('💰 Potential cost savings vs. full truckload');
      analysis.recommendations.push('📦 Consider consolidating with other shipments');
      
      if (weight <= 5000) {
        analysis.recommendations.push('🚚 Light weight - excellent LTL economics');
      }
      
      if (freightClass <= 85) {
        analysis.recommendations.push('📊 Low freight class - competitive rates available');
      }

      if (estimatedDistance <= 300) {
        analysis.recommendations.push('🌍 Regional distance - fast transit times');
      }
    } else {
      if (analysis.factors.weight.score === 0) {
        analysis.recommendations.push('❌ Weight exceeds LTL capacity - use truckload');
      }
      if (analysis.factors.distance.score === 0) {
        analysis.recommendations.push('❌ Distance too long - truckload more efficient');
      }
      if (!analysis.factors.equipment.compatible) {
        analysis.recommendations.push('❌ Equipment type requires dedicated truck');
      }
      if (freightClass > 200) {
        analysis.recommendations.push('⚠️ High freight class - truckload may be cost effective');
      }
    }

    // Suggest appropriate carriers
    if (analysis.eligible) {
      analysis.suggestedCarriers = ltlCarriers.filter(carrier => {
        if (weight > carrier.maxWeight) return false;
        if (hasUrgentKeywords && !carrier.specialties.includes('Expedited')) return false;
        return true;
      }).slice(0, 4); // Top 4 carriers
    }

    // Estimate rate
    if (analysis.eligible) {
      analysis.rateEstimate = estimateLtlRate(weight, estimatedDistance, freightClass);
    }

    return {
      ...analysis,
      reason: analysis.eligible ? 'Lane suitable for LTL service' : 'Lane not optimal for LTL'
    };

  } catch (error) {
    console.error('Error checking LTL eligibility:', error);
    return { eligible: false, reason: 'Error checking eligibility', error: error.message };
  }
}

// Estimate LTL rate based on weight, distance, and class
function estimateLtlRate(weight, distance, freightClass) {
  const baseRate = 150; // Base rate per shipment
  
  // Weight factor
  const weightBreak = ltlFactors.weightBreaks.find(wb => weight >= wb.min && weight <= wb.max);
  const weightFactor = weightBreak ? weightBreak.factor : 1.0;
  
  // Distance factor
  let distanceFactor = 1.0;
  for (const [dist, factor] of Object.entries(ltlFactors.distanceFactors)) {
    if (distance >= parseInt(dist)) {
      distanceFactor = factor;
    }
  }
  
  // Class factor
  const classFactor = ltlFactors.classFactors[freightClass] || 2.0;
  
  // Calculate rate per 100 lbs (CWT)
  const cwt = Math.ceil(weight / 100);
  const ratePerCwt = baseRate * weightFactor * distanceFactor * classFactor / 10;
  const totalRate = Math.round(ratePerCwt * cwt);
  
  return {
    ratePerCwt: Math.round(ratePerCwt * 100) / 100,
    totalRate: totalRate,
    factors: {
      weight: weightFactor,
      distance: distanceFactor,
      class: classFactor
    }
  };
}

// Generate professional LTL quote request email
export function generateLtlEmail(lane, analysis) {
  const currentDate = new Date().toLocaleDateString();
  const pickupDate = lane.pickup_earliest || 'TBD';
  
  const emailTemplate = `Subject: LTL Quote Request - ${lane.origin_city}, ${lane.origin_state} to ${lane.dest_city}, ${lane.dest_state}

Dear LTL Team,

Please provide LTL pricing for the following shipment:

SHIPMENT DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Pickup: ${lane.origin_city}, ${lane.origin_state} ${lane.origin_zip || ''}
📍 Delivery: ${lane.dest_city}, ${lane.dest_state} ${lane.dest_zip || ''}
📏 Distance: ~${analysis?.factors?.distance?.miles || 'TBD'} miles
⚖️ Weight: ${lane.weight_lbs ? parseInt(lane.weight_lbs).toLocaleString() : 'TBD'} lbs
📦 Pieces: ${lane.dimensions || 'TBD'}
📋 Commodity: ${lane.commodity || 'General freight'}
🏷️ Estimated Class: ${analysis?.estimatedClass || 'TBD'}
📅 Pickup Date: ${pickupDate}

${analysis?.eligible ? `
LTL SUITABILITY ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ LTL Score: ${analysis.score}/100 (${analysis.score >= 80 ? 'Excellent' : analysis.score >= 60 ? 'Good' : 'Fair'})

Key Factors:
${analysis.factors.weight.suitable ? '✅' : '❌'} Weight: ${analysis.factors.weight.lbs.toLocaleString()} lbs (${analysis.factors.weight.notes})
${analysis.factors.distance.suitable ? '✅' : '❌'} Distance: ${analysis.factors.distance.miles} miles (${analysis.factors.distance.notes})
${analysis.factors.equipment.compatible ? '✅' : '❌'} Equipment: ${analysis.factors.equipment.notes}
📊 Freight Class: ${analysis.estimatedClass} (${analysis.factors.commodity.notes})

${analysis.rateEstimate ? `
ESTIMATED RATE:
Rate per CWT: $${analysis.rateEstimate.ratePerCwt}
Total Estimate: $${analysis.rateEstimate.totalRate.toLocaleString()}
` : ''}

${analysis.suggestedCarriers.length > 0 ? `
SUGGESTED CARRIERS:
${analysis.suggestedCarriers.map(carrier => `• ${carrier.name} (${carrier.code}) - ${carrier.strengths.join(', ')}`).join('\n')}
` : ''}` : ''}

QUOTE REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please provide:
• Rate per CWT and total shipment cost
• Transit time from pickup to delivery  
• Any applicable accessorial charges
• Pickup and delivery requirements
• Insurance coverage and liability
• Tracking and shipment visibility

${lane.comment ? `
SPECIAL REQUIREMENTS:
${lane.comment}
` : ''}

${analysis?.factors?.accessorials?.required ? `
POTENTIAL ACCESSORIALS:
• Residential delivery (if applicable)
• Inside delivery (if required)
• Liftgate service (if needed)
• Appointment delivery
• Freeze protection (if applicable)
` : ''}

This shipment has ${analysis?.score >= 80 ? 'excellent' : analysis?.score >= 60 ? 'good' : 'moderate'} LTL potential. Looking forward to your competitive quote.

Best regards,
[Your Name]
[Phone Number]
[Email Address]

Generated: ${currentDate}
Reference: Lane ${lane.id || 'TBD'}`;

  return emailTemplate;
}

// Legacy function for compatibility
export function isLtlCandidate({ weight, equipment, pieces, miles }) {
  const maxLtlWeight = 15000;
  const maxLtlSkids = 6;
  const maxDistance = 1000;

  if (!weight || !equipment) return false;

  const isWeightOk = parseInt(weight) <= maxLtlWeight;
  const isSkidsOk = pieces ? parseInt(pieces) <= maxLtlSkids : true;
  const isDistanceOk = miles ? parseInt(miles) <= maxDistance : true;

  const equipmentText = equipment.toLowerCase();
  const isLikelyLtl = equipmentText.includes("box") || equipmentText.includes("van") || equipmentText.includes("ltl") || equipmentText.includes("partial");

  return isWeightOk && isSkidsOk && isDistanceOk && isLikelyLtl;
}

// Helper function to estimate distance between states
function estimateDistance(originState, destState) {
  const stateDistances = {
    'CA-NY': 2900, 'CA-FL': 2400, 'CA-TX': 1200, 'CA-IL': 2000, 'CA-GA': 2200,
    'TX-NY': 1600, 'TX-FL': 1000, 'TX-CA': 1200, 'TX-IL': 900, 'TX-GA': 800,
    'FL-NY': 1100, 'FL-CA': 2400, 'FL-TX': 1000, 'FL-IL': 1100, 'FL-GA': 350,
    'NY-CA': 2900, 'NY-TX': 1600, 'NY-FL': 1100, 'NY-IL': 800, 'NY-GA': 900,
    'IL-CA': 2000, 'IL-TX': 900, 'IL-FL': 1100, 'IL-NY': 800, 'IL-GA': 500,
    'GA-CA': 2200, 'GA-TX': 800, 'GA-FL': 350, 'GA-NY': 900, 'GA-IL': 500
  };

  const key1 = `${originState}-${destState}`;
  const key2 = `${destState}-${originState}`;
  
  return stateDistances[key1] || stateDistances[key2] || 800;
}
