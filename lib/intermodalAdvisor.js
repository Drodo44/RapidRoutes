// lib/intermodalAdvisor.js

const railRamps = [
  { city: "Atlanta", state: "GA", zip: "30336" },
  { city: "Dallas", state: "TX", zip: "75212" },
  { city: "Chicago", state: "IL", zip: "60638" },
  { city: "Los Angeles", state: "CA", zip: "90058" },
  { city: "New Jersey", state: "NJ", zip: "07105" },
  { city: "Kansas City", state: "MO", zip: "64120" },
  { city: "Memphis", state: "TN", zip: "38118" },
  { city: "St. Louis", state: "MO", zip: "63147" },
  { city: "Portland", state: "OR", zip: "97218" },
  { city: "Seattle", state: "WA", zip: "98108" },
  { city: "Salt Lake City", state: "UT", zip: "84104" },
];

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

// Enhanced function for lane eligibility checking
export async function checkIntermodalEligibility(lane) {
  try {
    // Basic validation
    if (!lane.origin_city || !lane.origin_state || !lane.dest_city || !lane.dest_state) {
      return { eligible: false, reason: 'Missing origin or destination' };
    }

    // Estimate distance (simple calculation - could be enhanced)
    const distance = estimateDistance(lane.origin_state, lane.dest_state);
    
    // Check distance requirement (650+ miles)
    if (distance < 650) {
      return { eligible: false, reason: 'Distance too short for intermodal (< 650 miles)' };
    }

    // Check weight if available
    const weight = lane.weight_lbs || 25000; // Default weight if not specified
    if (weight > 43500) {
      return { eligible: false, reason: 'Weight too heavy for intermodal (> 43,500 lbs)' };
    }

    // Check equipment type - some equipment types are better for intermodal
    const equipment = lane.equipment_code?.toUpperCase();
    const intermodalFriendly = ['V', 'VAN', 'DV', 'R', 'REEFER', 'C', 'CONTAINER'];
    
    if (equipment && !intermodalFriendly.some(eq => equipment.includes(eq))) {
      return { eligible: false, reason: 'Equipment type not suitable for intermodal' };
    }

    // Check proximity to rail ramps
    const nearOriginRamp = railRamps.some(ramp => 
      ramp.state === lane.origin_state && isNearbyCity(ramp.city, lane.origin_city)
    );
    
    const nearDestRamp = railRamps.some(ramp => 
      ramp.state === lane.dest_state && isNearbyCity(ramp.city, lane.dest_city)
    );

    if (!nearOriginRamp || !nearDestRamp) {
      return { eligible: false, reason: 'Not near rail ramps' };
    }

    return {
      eligible: true,
      reason: 'Lane meets intermodal criteria',
      details: {
        estimatedDistance: distance,
        weight: weight,
        equipment: equipment,
        nearRamps: { origin: nearOriginRamp, destination: nearDestRamp }
      }
    };

  } catch (error) {
    console.error('Error checking intermodal eligibility:', error);
    return { eligible: false, reason: 'Error checking eligibility' };
  }
}

// Helper function to estimate distance between states (rough calculation)
function estimateDistance(originState, destState) {
  const stateDistances = {
    'CA-NY': 2900, 'CA-FL': 2400, 'CA-TX': 1200, 'CA-IL': 2000,
    'TX-NY': 1600, 'TX-FL': 1000, 'TX-CA': 1200, 'TX-IL': 900,
    'FL-NY': 1100, 'FL-CA': 2400, 'FL-TX': 1000, 'FL-IL': 1100,
    'NY-CA': 2900, 'NY-TX': 1600, 'NY-FL': 1100, 'NY-IL': 800,
    'IL-CA': 2000, 'IL-TX': 900, 'IL-FL': 1100, 'IL-NY': 800
  };

  const key1 = `${originState}-${destState}`;
  const key2 = `${destState}-${originState}`;
  
  return stateDistances[key1] || stateDistances[key2] || 800; // Default to 800 miles
}

// Helper function to check if cities are nearby (rough check)
function isNearbyCity(rampCity, laneCity) {
  // Simple string matching - could be enhanced with proper distance calculation
  return laneCity.toLowerCase().includes(rampCity.toLowerCase()) || 
         rampCity.toLowerCase().includes(laneCity.toLowerCase()) ||
         laneCity.toLowerCase() === rampCity.toLowerCase();
}
