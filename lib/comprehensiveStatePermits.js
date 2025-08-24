// lib/comprehensiveStatePermits.js
// Comprehensive state-by-state permit requirements and routing information

export const STATE_PERMIT_REQUIREMENTS = {
  "AL": {
    name: "Alabama",
    office: "Alabama DOT Motor Carrier Services",
    phone: "(334) 242-6359",
    email: "motorcarrier@dot.alabama.gov",
    website: "www.dot.alabama.gov",
    limits: {
      width: 102, // 8'6"
      height: 162, // 13'6" 
      length: 636, // 53'
      weight: 80000
    },
    permitThresholds: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    specialRequirements: {
      escortRequired: "Loads over 12' wide or 15' high",
      timeRestrictions: "No weekend travel for super loads",
      routeRestrictions: "Interstate travel preferred",
      fees: "$15-$200 depending on dimensions"
    },
    processingTime: "2-5 business days",
    notes: "Required 72-hour advance notice for super loads"
  },

  "AZ": {
    name: "Arizona", 
    office: "Arizona DOT Motor Vehicle Division",
    phone: "(602) 712-8355",
    email: "overdimensional@azdot.gov",
    website: "www.azdot.gov",
    limits: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    permitThresholds: {
      width: 102,
      height: 162, 
      length: 636,
      weight: 80000
    },
    specialRequirements: {
      escortRequired: "Loads over 10' wide",
      timeRestrictions: "Summer heat restrictions May-September",
      routeRestrictions: "Designated routes only for super loads",
      fees: "$25-$300 based on size and route"
    },
    processingTime: "1-3 business days",
    notes: "Extreme heat restrictions during summer months"
  },

  "CA": {
    name: "California",
    office: "Caltrans Transportation Permits",
    phone: "(916) 654-6393", 
    email: "permits@dot.ca.gov",
    website: "www.dot.ca.gov",
    limits: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    permitThresholds: {
      width: 102,
      height: 162,
      length: 636, 
      weight: 80000
    },
    specialRequirements: {
      escortRequired: "Loads over 8'6\" wide or 14' high",
      timeRestrictions: "Severe restrictions in metro areas",
      routeRestrictions: "Extensive bridge and tunnel restrictions",
      fees: "$15-$1000+ for complex moves"
    },
    processingTime: "3-10 business days",
    notes: "Most restrictive state - early planning essential"
  },

  "FL": {
    name: "Florida",
    office: "Florida DOT Commercial Vehicle Operations", 
    phone: "(850) 617-2600",
    email: "oversize@fdot.gov",
    website: "www.fdot.gov",
    limits: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    permitThresholds: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    specialRequirements: {
      escortRequired: "Loads over 12' wide",
      timeRestrictions: "Hurricane season restrictions",
      routeRestrictions: "Bridge restrictions common",
      fees: "$10-$125 standard permits"
    },
    processingTime: "1-5 business days", 
    notes: "Weather-dependent restrictions during hurricane season"
  },

  "TX": {
    name: "Texas",
    office: "TxDOT Motor Carrier Division",
    phone: "(800) 299-1700",
    email: "mcd-permits@txdot.gov", 
    website: "www.txdot.gov",
    limits: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    permitThresholds: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    specialRequirements: {
      escortRequired: "Loads over 14' wide or 16' high",
      timeRestrictions: "Rush hour restrictions in major cities",
      routeRestrictions: "Designated superhighway system",
      fees: "$60-$1000+ for super loads"
    },
    processingTime: "2-7 business days",
    notes: "Favorable regulations for oversize loads"
  },

  "IL": {
    name: "Illinois",
    office: "Illinois DOT Bureau of Operations", 
    phone: "(217) 782-6953",
    email: "dot.permits@illinois.gov",
    website: "www.idot.illinois.gov",
    limits: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    permitThresholds: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    specialRequirements: {
      escortRequired: "Loads over 12' wide or 15' high",
      timeRestrictions: "Winter weather restrictions",
      routeRestrictions: "Chicago area requires special routing",
      fees: "$20-$200 depending on load"
    },
    processingTime: "3-5 business days",
    notes: "Winter weather can cause significant delays"
  },

  "NY": {
    name: "New York",
    office: "NYSDOT Transportation Permits",
    phone: "(518) 457-2320",
    email: "permits@dot.ny.gov",
    website: "www.dot.ny.gov", 
    limits: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    permitThresholds: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    specialRequirements: {
      escortRequired: "Loads over 10' wide",
      timeRestrictions: "Severe NYC restrictions",
      routeRestrictions: "Many low bridges and weight restrictions",
      fees: "$25-$500+ for complex routes"
    },
    processingTime: "5-10 business days",
    notes: "NYC requires separate permits and coordination"
  },

  "OH": {
    name: "Ohio",
    office: "Ohio DOT Office of Special Hauling Permits",
    phone: "(614) 466-4590", 
    email: "permits@dot.ohio.gov",
    website: "www.transportation.ohio.gov",
    limits: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    permitThresholds: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    specialRequirements: {
      escortRequired: "Loads over 12' wide or 15' high",
      timeRestrictions: "Rush hour restrictions",
      routeRestrictions: "Designated routes for super loads",
      fees: "$15-$300 depending on size"
    },
    processingTime: "2-5 business days",
    notes: "Generally permit-friendly state"
  },

  "PA": {
    name: "Pennsylvania",
    office: "PennDOT Motor Carrier Services",
    phone: "(717) 787-7445",
    email: "penndotpermits@pa.gov",
    website: "www.penndot.gov",
    limits: {
      width: 102,
      height: 162, 
      length: 636,
      weight: 80000
    },
    permitThresholds: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    specialRequirements: {
      escortRequired: "Loads over 11' wide or 15' high",
      timeRestrictions: "Winter weather restrictions",
      routeRestrictions: "Mountain grade restrictions",
      fees: "$20-$400 for oversized loads"
    },
    processingTime: "3-7 business days",
    notes: "Mountainous terrain creates routing challenges"
  },

  "GA": {
    name: "Georgia",
    office: "Georgia DOT Motor Carrier Compliance",
    phone: "(404) 635-8597",
    email: "permits@dot.ga.gov", 
    website: "www.dot.ga.gov",
    limits: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    permitThresholds: {
      width: 102,
      height: 162,
      length: 636,
      weight: 80000
    },
    specialRequirements: {
      escortRequired: "Loads over 12' wide",
      timeRestrictions: "Atlanta rush hour restrictions",
      routeRestrictions: "Perimeter routing around Atlanta",
      fees: "$20-$150 for standard permits"
    },
    processingTime: "2-5 business days",
    notes: "Atlanta metro area requires careful routing"
  }
};

export const MULTI_STATE_CORRIDORS = {
  "I-5": {
    name: "Interstate 5 Corridor",
    states: ["CA", "OR", "WA"],
    coordinator: "Pacific Northwest Transportation Consortium",
    phone: "(503) 986-3000",
    specialConsiderations: [
      "Coordinate with all three states",
      "Seismic zone considerations",
      "Weather restrictions in mountain passes",
      "Port access considerations"
    ]
  },
  
  "I-95": {
    name: "Interstate 95 Eastern Corridor", 
    states: ["FL", "GA", "SC", "NC", "VA", "MD", "DE", "PA", "NJ", "NY", "CT", "RI", "MA", "NH", "ME"],
    coordinator: "I-95 Corridor Coalition",
    phone: "(202) 408-9541",
    specialConsiderations: [
      "Multiple state coordination required",
      "Heavy traffic congestion", 
      "Bridge and tunnel restrictions",
      "Hurricane evacuation route conflicts"
    ]
  },

  "I-10": {
    name: "Interstate 10 Southern Corridor",
    states: ["CA", "AZ", "NM", "TX", "LA", "MS", "AL", "FL"],
    coordinator: "I-10 Coalition",
    phone: "(713) 284-8800", 
    specialConsiderations: [
      "Desert heat restrictions",
      "Hurricane zone considerations",
      "Border crossing complications", 
      "Weight restrictions on older bridges"
    ]
  }
};

// Function to get permit requirements for a specific route
export function getRoutePermitRequirements(originState, destState, dimensions, weight) {
  const route = [];
  const requirements = [];
  
  // Add origin state
  if (STATE_PERMIT_REQUIREMENTS[originState]) {
    route.push(originState);
    requirements.push({
      state: originState,
      ...STATE_PERMIT_REQUIREMENTS[originState],
      permitNeeded: checkIfPermitNeeded(STATE_PERMIT_REQUIREMENTS[originState], dimensions, weight)
    });
  }
  
  // Add destination state if different
  if (destState !== originState && STATE_PERMIT_REQUIREMENTS[destState]) {
    route.push(destState);
    requirements.push({
      state: destState, 
      ...STATE_PERMIT_REQUIREMENTS[destState],
      permitNeeded: checkIfPermitNeeded(STATE_PERMIT_REQUIREMENTS[destState], dimensions, weight)
    });
  }
  
  return {
    route,
    requirements,
    multiStateConsiderations: getMultiStateConsiderations(route)
  };
}

function checkIfPermitNeeded(stateInfo, dimensions, weight) {
  const { width = 0, height = 0, length = 0 } = dimensions;
  const loadWeight = weight || 0;
  
  const exceedsWidth = width > stateInfo.permitThresholds.width;
  const exceedsHeight = height > stateInfo.permitThresholds.height;
  const exceedsLength = length > stateInfo.permitThresholds.length;
  const exceedsWeight = loadWeight > stateInfo.permitThresholds.weight;
  
  return {
    required: exceedsWidth || exceedsHeight || exceedsLength || exceedsWeight,
    reasons: [
      ...(exceedsWidth ? [`Width ${width}" exceeds ${stateInfo.permitThresholds.width}"`] : []),
      ...(exceedsHeight ? [`Height ${height}" exceeds ${stateInfo.permitThresholds.height}"`] : []),
      ...(exceedsLength ? [`Length ${length}" exceeds ${stateInfo.permitThresholds.length}"`] : []),
      ...(exceedsWeight ? [`Weight ${loadWeight} lbs exceeds ${stateInfo.permitThresholds.weight} lbs`] : [])
    ]
  };
}

function getMultiStateConsiderations(route) {
  // Check if route matches any known corridors
  for (const [corridorId, corridor] of Object.entries(MULTI_STATE_CORRIDORS)) {
    const routeMatchesCorridor = route.every(state => corridor.states.includes(state));
    if (routeMatchesCorridor) {
      return {
        corridor: corridorId,
        ...corridor
      };
    }
  }
  
  return null;
}
