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

// Helper function to estimate distance between states using coordinate-based calculation
function estimateDistance(originState, destState) {
  // State center coordinates (latitude, longitude)
  const stateCoords = {
    'AL': [32.8, -86.8], 'AK': [64.0, -150.0], 'AZ': [34.2, -111.9], 'AR': [34.7, -92.2],
    'CA': [36.8, -119.8], 'CO': [39.0, -105.5], 'CT': [41.6, -72.7], 'DE': [39.3, -75.5],
    'FL': [27.8, -81.6], 'GA': [32.2, -83.1], 'HI': [21.3, -157.8], 'ID': [44.1, -114.7],
    'IL': [40.3, -89.4], 'IN': [39.8, -86.1], 'IA': [41.6, -93.1], 'KS': [38.5, -96.7],
    'KY': [37.7, -84.9], 'LA': [30.9, -91.8], 'ME': [44.3, -69.8], 'MD': [39.0, -76.5],
    'MA': [42.2, -71.5], 'MI': [43.3, -84.5], 'MN': [45.4, -93.9], 'MS': [32.7, -89.7],
    'MO': [38.5, -92.2], 'MT': [47.1, -110.5], 'NE': [41.1, -99.9], 'NV': [39.8, -117.0],
    'NH': [43.4, -71.5], 'NJ': [40.3, -74.5], 'NM': [34.8, -106.2], 'NY': [42.2, -74.9],
    'NC': [35.6, -79.8], 'ND': [47.5, -99.8], 'OH': [40.3, -82.7], 'OK': [35.4, -97.1],
    'OR': [44.9, -122.1], 'PA': [40.3, -77.2], 'RI': [41.7, -71.4], 'SC': [33.8, -80.9],
    'SD': [44.3, -99.4], 'TN': [35.7, -86.7], 'TX': [31.1, -97.6], 'UT': [40.1, -111.9],
    'VT': [44.0, -72.6], 'VA': [37.7, -78.2], 'WA': [47.4, -121.1], 'WV': [38.5, -80.9],
    'WI': [44.3, -90.0], 'WY': [42.7, -107.3]
  };

  const originCoords = stateCoords[originState];
  const destCoords = stateCoords[destState];

  if (!originCoords || !destCoords) {
    console.warn(`Missing coordinates for states: ${originState}, ${destState}`);
    return 500; // Conservative default for unknown states
  }

  // Calculate great circle distance using Haversine formula
  const [lat1, lon1] = originCoords;
  const [lat2, lon2] = destCoords;
  
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;

  console.log(`Distance calculation: ${originState} to ${destState} = ${Math.round(distance)} miles`);
  return Math.round(distance);
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
