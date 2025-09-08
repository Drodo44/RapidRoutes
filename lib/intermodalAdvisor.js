// lib/intermodalAdvisor.js

// Comprehensive rail ramp database with service providers
const railRamps = [
  { 
    city: "Atlanta", state: "GA", zip: "30336", 
    providers: ["NS", "CSX"], 
    coordinates: { lat: 33.7490, lng: -84.3880 },
    services: ["container", "trailer", "bulk"]
  },
  { 
    city: "Dallas", state: "TX", zip: "75212", 
    providers: ["BNSF", "UP"], 
    coordinates: { lat: 32.7767, lng: -96.7970 },
    services: ["container", "trailer", "automotive"]
  },
  { 
    city: "Chicago", state: "IL", zip: "60638", 
    providers: ["BNSF", "NS", "CSX", "CN"], 
    coordinates: { lat: 41.8781, lng: -87.6298 },
    services: ["container", "trailer", "bulk", "automotive"]
  },
  { 
    city: "Los Angeles", state: "CA", zip: "90058", 
    providers: ["BNSF", "UP"], 
    coordinates: { lat: 34.0522, lng: -118.2437 },
    services: ["container", "trailer", "port"]
  },
  { 
    city: "Newark", state: "NJ", zip: "07105", 
    providers: ["NS", "CSX"], 
    coordinates: { lat: 40.7357, lng: -74.1724 },
    services: ["container", "trailer", "port"]
  },
  { 
    city: "Kansas City", state: "MO", zip: "64120", 
    providers: ["BNSF", "NS", "KCS"], 
    coordinates: { lat: 39.0997, lng: -94.5786 },
    services: ["container", "trailer", "automotive"]
  },
  { 
    city: "Memphis", state: "TN", zip: "38118", 
    providers: ["BNSF", "NS", "CN"], 
    coordinates: { lat: 35.1495, lng: -90.0490 },
    services: ["container", "trailer", "bulk"]
  },
  { 
    city: "St. Louis", state: "MO", zip: "63147", 
    providers: ["BNSF", "NS", "UP"], 
    coordinates: { lat: 38.6270, lng: -90.1994 },
    services: ["container", "trailer", "automotive"]
  },
  { 
    city: "Portland", state: "OR", zip: "97218", 
    providers: ["BNSF", "UP"], 
    coordinates: { lat: 45.5152, lng: -122.6784 },
    services: ["container", "trailer", "port"]
  },
  { 
    city: "Seattle", state: "WA", zip: "98108", 
    providers: ["BNSF", "UP"], 
    coordinates: { lat: 47.6062, lng: -122.3321 },
    services: ["container", "trailer", "port"]
  },
  { 
    city: "Salt Lake City", state: "UT", zip: "84104", 
    providers: ["UP"], 
    coordinates: { lat: 40.7608, lng: -111.8910 },
    services: ["container", "trailer"]
  },
  { 
    city: "Houston", state: "TX", zip: "77032", 
    providers: ["BNSF", "UP", "KCS"], 
    coordinates: { lat: 29.7604, lng: -95.3698 },
    services: ["container", "trailer", "port", "petrochemical"]
  },
  { 
    city: "Phoenix", state: "AZ", zip: "85043", 
    providers: ["BNSF", "UP"], 
    coordinates: { lat: 33.4484, lng: -112.0740 },
    services: ["container", "trailer"]
  },
  { 
    city: "Detroit", state: "MI", zip: "48209", 
    providers: ["NS", "CSX", "CN"], 
    coordinates: { lat: 42.3314, lng: -83.0458 },
    services: ["container", "trailer", "automotive"]
  },
  { 
    city: "Jacksonville", state: "FL", zip: "32218", 
    providers: ["NS", "CSX"], 
    coordinates: { lat: 30.3322, lng: -81.6557 },
    services: ["container", "trailer", "port"]
  }
];

// Equipment compatibility for intermodal
const equipmentCompatibility = {
  "V": { compatible: true, notes: "Excellent for intermodal - standard dry van" },
  "VAN": { compatible: true, notes: "Perfect for intermodal service" },
  "DV": { compatible: true, notes: "Dry van - ideal for rail" },
  "R": { compatible: true, notes: "Reefer containers available" },
  "REEFER": { compatible: true, notes: "Temperature-controlled intermodal available" },
  "C": { compatible: true, notes: "Container service" },
  "CONTAINER": { compatible: true, notes: "Direct container movement" },
  "FD": { compatible: false, notes: "Flatbed not suitable for standard intermodal" },
  "FLATBED": { compatible: false, notes: "Requires specialized rail service" },
  "SD": { compatible: false, notes: "Step deck requires specialized handling" },
  "RGN": { compatible: false, notes: "Heavy haul not suitable for intermodal" },
  "LB": { compatible: false, notes: "Lowboy requires truck-only transport" }
};

// Calculate distance using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Find nearest rail ramps to a given coordinate
function findNearestRamps(targetLat, targetLng, maxDistance = 150) {
  return railRamps
    .map(ramp => ({
      ...ramp,
      distance: calculateDistance(targetLat, targetLng, ramp.coordinates.lat, ramp.coordinates.lng)
    }))
    .filter(ramp => ramp.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance);
}

// Enhanced intermodal eligibility checker
export async function checkIntermodalEligibility(lane) {
  try {
    const analysis = {
      eligible: false,
      score: 0,
      factors: {},
      recommendations: [],
      nearbyRamps: { origin: [], destination: [] },
      estimatedSavings: null,
      transitTime: null
    };

    // Basic validation
    if (!lane.origin_city || !lane.dest_city) {
      return { ...analysis, reason: 'Missing origin or destination information' };
    }

    // Distance analysis
    const estimatedDistance = estimateDistance(lane.origin_state, lane.dest_state);
    analysis.factors.distance = {
      miles: estimatedDistance,
      suitable: estimatedDistance >= 650,
      score: estimatedDistance >= 650 ? 25 : 0,
      notes: estimatedDistance >= 650 ? 'Good distance for intermodal' : 'Too short for intermodal efficiency'
    };

    // Weight analysis
    const weight = parseInt(lane.weight_lbs) || 25000;
    analysis.factors.weight = {
      lbs: weight,
      suitable: weight <= 43500,
      score: weight <= 43500 ? 20 : 0,
      notes: weight <= 43500 ? 'Weight within intermodal limits' : 'Exceeds standard intermodal weight limit'
    };

    // Equipment analysis
    const equipment = lane.equipment_code?.toUpperCase() || 'V';
    const equipmentInfo = equipmentCompatibility[equipment] || equipmentCompatibility['V'];
    analysis.factors.equipment = {
      type: equipment,
      compatible: equipmentInfo.compatible,
      score: equipmentInfo.compatible ? 20 : 0,
      notes: equipmentInfo.notes
    };

    // Commodity analysis (if available)
    const commodity = lane.commodity?.toLowerCase() || '';
    const hazmatIndicators = ['hazmat', 'dangerous', 'flammable', 'explosive', 'toxic'];
    const isHazmat = hazmatIndicators.some(indicator => commodity.includes(indicator));
    
    analysis.factors.commodity = {
      description: lane.commodity || 'Not specified',
      hazmat: isHazmat,
      score: isHazmat ? -10 : 10,
      notes: isHazmat ? 'Hazmat may require special handling' : 'Standard commodity suitable for rail'
    };

    // Time sensitivity analysis
    const hasUrgentKeywords = ['urgent', 'asap', 'rush', 'hot'].some(keyword => 
      (lane.comment?.toLowerCase() || '').includes(keyword)
    );
    
    analysis.factors.timing = {
      urgent: hasUrgentKeywords,
      score: hasUrgentKeywords ? -5 : 15,
      notes: hasUrgentKeywords ? 'Urgent shipments better via truck' : 'Standard timing suitable for rail'
    };

    // Calculate total score
    analysis.score = Object.values(analysis.factors).reduce((sum, factor) => sum + factor.score, 0);

    // Determine eligibility
    analysis.eligible = analysis.score >= 50;

    // Generate recommendations
    if (analysis.eligible) {
      analysis.recommendations.push('✅ Strong candidate for intermodal service');
      analysis.recommendations.push('💰 Potential cost savings of 10-20% vs OTR');
      analysis.recommendations.push('🌱 Environmental benefits with reduced emissions');
      
      if (estimatedDistance > 1000) {
        analysis.recommendations.push('🚄 Long haul distance ideal for rail efficiency');
      }
      
      if (weight < 30000) {
        analysis.recommendations.push('📦 Light weight allows for flexible scheduling');
      }
    } else {
      if (analysis.factors.distance.score === 0) {
        analysis.recommendations.push('❌ Distance too short - recommend OTR truck');
      }
      if (!analysis.factors.equipment.compatible) {
        analysis.recommendations.push('❌ Equipment type requires truck-only transport');
      }
      if (analysis.factors.weight.score === 0) {
        analysis.recommendations.push('❌ Weight exceeds intermodal capacity');
      }
      if (analysis.factors.timing.urgent) {
        analysis.recommendations.push('⏰ Time sensitivity favors direct truck transport');
      }
    }

    // Estimate cost savings and transit time
    if (analysis.eligible) {
      const truckRate = estimatedDistance * 2.1; // Rough estimate
      const railRate = truckRate * 0.85; // 15% savings typical
      analysis.estimatedSavings = {
        truckRate: Math.round(truckRate),
        railRate: Math.round(railRate),
        savings: Math.round(truckRate - railRate),
        percentage: '10-20%'
      };

      // Transit time (rail typically 1-2 days longer)
      const truckDays = Math.ceil(estimatedDistance / 550); // 550 miles per day
      const railDays = truckDays + 2;
      analysis.transitTime = {
        truck: `${truckDays} days`,
        rail: `${railDays} days`,
        difference: `+${railDays - truckDays} days`
      };
    }

    return {
      ...analysis,
      reason: analysis.eligible ? 'Lane meets intermodal criteria' : 'Lane not suitable for intermodal'
    };

  } catch (error) {
    console.error('Error checking intermodal eligibility:', error);
    return { eligible: false, reason: 'Error checking eligibility', error: error.message };
  }
}

// Generate professional intermodal inquiry email
export function generateIntermodalEmail(lane, analysis) {
  const currentDate = new Date().toLocaleDateString();
  const pickupDate = lane.pickup_earliest || 'TBD';
  
  const emailTemplate = `Subject: Intermodal Quote Request - ${lane.origin_city}, ${lane.origin_state} to ${lane.dest_city}, ${lane.dest_state}

Dear Intermodal Team,

I have a lane that appears to be an excellent candidate for intermodal service. Please provide your best rate and service options.

SHIPMENT DETAILS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Origin: ${lane.origin_city}, ${lane.origin_state} ${lane.origin_zip || ''}
📍 Destination: ${lane.dest_city}, ${lane.dest_state} ${lane.dest_zip || ''}
📏 Estimated Distance: ${analysis?.factors?.distance?.miles || 'TBD'} miles
📦 Equipment: ${lane.equipment_code || 'Van'} (${analysis?.factors?.equipment?.notes || 'Standard dry van'})
⚖️ Weight: ${lane.weight_lbs ? parseInt(lane.weight_lbs).toLocaleString() : 'TBD'} lbs
📋 Commodity: ${lane.commodity || 'General freight'}
📅 Pickup Date: ${pickupDate}

${analysis?.eligible ? `
INTERMODAL SUITABILITY ANALYSIS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Intermodal Score: ${analysis.score}/100 (${analysis.score >= 70 ? 'Excellent' : analysis.score >= 50 ? 'Good' : 'Fair'})

Key Factors:
${analysis.factors.distance.suitable ? '✅' : '❌'} Distance: ${analysis.factors.distance.miles} miles (${analysis.factors.distance.notes})
${analysis.factors.weight.suitable ? '✅' : '❌'} Weight: ${analysis.factors.weight.lbs.toLocaleString()} lbs (${analysis.factors.weight.notes})
${analysis.factors.equipment.compatible ? '✅' : '❌'} Equipment: ${analysis.factors.equipment.notes}
${!analysis.factors.timing.urgent ? '✅' : '❌'} Timing: ${analysis.factors.timing.notes}

${analysis.estimatedSavings ? `
ESTIMATED COMPARISON:
Truck Rate: ~$${analysis.estimatedSavings.truckRate.toLocaleString()}
Rail Rate: ~$${analysis.estimatedSavings.railRate.toLocaleString()}
Potential Savings: $${analysis.estimatedSavings.savings.toLocaleString()} (${analysis.estimatedSavings.percentage})

Transit Time:
Truck: ${analysis.transitTime.truck}
Rail: ${analysis.transitTime.rail}
` : ''}` : ''}

QUOTE REQUEST:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Please provide:
• Best all-in rate (including dray on both ends)
• Transit time from pickup to delivery
• Equipment availability for requested date
• Any special requirements or restrictions
• Pickup and delivery appointment procedures

${lane.comment ? `
ADDITIONAL NOTES:
${lane.comment}
` : ''}

This lane has ${analysis?.score >= 70 ? 'excellent' : analysis?.score >= 50 ? 'good' : 'moderate'} intermodal potential. Looking forward to your competitive quote.

Best regards,
[Your Name]
[Phone Number]
[Email Address]

Generated: ${currentDate}
Reference: Lane ${lane.id || 'TBD'}`;

  return emailTemplate;
}

// Legacy functions for compatibility
function zipMatch(zip1, zip2, range = 40) {
  const z1 = parseInt(zip1.slice(0, 3));
  const z2 = parseInt(zip2.slice(0, 3));
  return Math.abs(z1 - z2) <= Math.ceil(range / 10);
}

export function isIntermodalCandidate({ origin_zip, dest_zip, weight, miles }) {
  if (!origin_zip || !dest_zip || !weight || !miles) return false;

  const isDistanceGood = miles >= 650;
  const isWeightGood = parseInt(weight) <= 43500;

  const nearOriginRamp = railRamps.some(r => zipMatch(r.zip, origin_zip));
  const nearDestRamp = railRamps.some(r => zipMatch(r.zip, dest_zip));

  return isDistanceGood && isWeightGood && nearOriginRamp && nearDestRamp;
}

// Helper function to estimate distance between states (enhanced)
function estimateDistance(originState, destState) {
  const stateDistances = {
    'CA-NY': 2900, 'CA-FL': 2400, 'CA-TX': 1200, 'CA-IL': 2000, 'CA-GA': 2200,
    'TX-NY': 1600, 'TX-FL': 1000, 'TX-CA': 1200, 'TX-IL': 900, 'TX-GA': 800,
    'FL-NY': 1100, 'FL-CA': 2400, 'FL-TX': 1000, 'FL-IL': 1100, 'FL-GA': 350,
    'NY-CA': 2900, 'NY-TX': 1600, 'NY-FL': 1100, 'NY-IL': 800, 'NY-GA': 900,
    'IL-CA': 2000, 'IL-TX': 900, 'IL-FL': 1100, 'IL-NY': 800, 'IL-GA': 500,
    'GA-CA': 2200, 'GA-TX': 800, 'GA-FL': 350, 'GA-NY': 900, 'GA-IL': 500,
    'OH-CA': 2100, 'OH-TX': 1200, 'OH-FL': 900, 'OH-NY': 500, 'OH-IL': 350,
    'PA-CA': 2500, 'PA-TX': 1400, 'PA-FL': 1000, 'PA-NY': 200, 'PA-IL': 600,
    'MI-CA': 2200, 'MI-TX': 1100, 'MI-FL': 1100, 'MI-NY': 600, 'MI-IL': 300,
    'NC-CA': 2300, 'NC-TX': 1100, 'NC-FL': 500, 'NC-NY': 500, 'NC-IL': 600,
    'TN-CA': 1900, 'TN-TX': 700, 'TN-FL': 600, 'TN-NY': 700, 'TN-IL': 300,
    'SC-CA': 2200, 'SC-TX': 1000, 'SC-FL': 300, 'SC-NY': 700, 'SC-IL': 700, 'SC-VA': 390,
    'VA-CA': 2400, 'VA-TX': 1300, 'VA-FL': 800, 'VA-NY': 350, 'VA-IL': 600,
    'AL-CA': 1800, 'AL-TX': 600, 'AL-FL': 300, 'AL-NY': 900, 'AL-IL': 500,
    'AZ-CA': 400, 'AZ-TX': 800, 'AZ-FL': 1800, 'AZ-NY': 2400, 'AZ-IL': 1400,
    'CO-CA': 1000, 'CO-TX': 600, 'CO-FL': 1400, 'CO-NY': 1800, 'CO-IL': 900,
    'NV-CA': 250, 'NV-TX': 1000, 'NV-FL': 2000, 'NV-NY': 2500, 'NV-IL': 1600,
    'OR-CA': 600, 'OR-TX': 1400, 'OR-FL': 2600, 'OR-NY': 2900, 'OR-IL': 2000,
    'WA-CA': 800, 'WA-TX': 1600, 'WA-FL': 2800, 'WA-NY': 2900, 'WA-IL': 2100
  };

  const key1 = `${originState}-${destState}`;
  const key2 = `${destState}-${originState}`;
  
  return stateDistances[key1] || stateDistances[key2] || 800; // Default to 800 miles
}

// Helper function to check if cities are nearby (enhanced)
function isNearbyCity(rampCity, laneCity) {
  const normalizeCity = (city) => city.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const normalizedRamp = normalizeCity(rampCity);
  const normalizedLane = normalizeCity(laneCity);
  
  return normalizedLane.includes(normalizedRamp) || 
         normalizedRamp.includes(normalizedLane) ||
         normalizedLane === normalizedRamp;
}
