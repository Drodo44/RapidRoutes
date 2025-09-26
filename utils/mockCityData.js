// Mock data for the intelligence-pairing API
// This file provides hardcoded test data for when the database is unavailable

export const mockCities = {
  // Atlanta coordinates: 33.749, -84.388
  atlanta: [
    { city: 'Atlanta', state_or_province: 'GA', zip_code: '30303', kma_code: 'ATL', kma_name: 'Atlanta', latitude: 33.749, longitude: -84.388, distance_miles: 0 },
    { city: 'Marietta', state_or_province: 'GA', zip_code: '30060', kma_code: 'ATL', kma_name: 'Atlanta', latitude: 33.9525, longitude: -84.5499, distance_miles: 15.2 },
    { city: 'Alpharetta', state_or_province: 'GA', zip_code: '30004', kma_code: 'ATL', kma_name: 'Atlanta', latitude: 34.0754, longitude: -84.2941, distance_miles: 22.5 },
    { city: 'Lawrenceville', state_or_province: 'GA', zip_code: '30045', kma_code: 'ATL', kma_name: 'Atlanta', latitude: 33.9562, longitude: -83.9879, distance_miles: 30.3 },
    { city: 'Cartersville', state_or_province: 'GA', zip_code: '30120', kma_code: 'ROM', kma_name: 'Rome', latitude: 34.1654, longitude: -84.8004, distance_miles: 42.5 },
    { city: 'Rome', state_or_province: 'GA', zip_code: '30165', kma_code: 'ROM', kma_name: 'Rome', latitude: 34.257, longitude: -85.1647, distance_miles: 58.9 },
    { city: 'Athens', state_or_province: 'GA', zip_code: '30605', kma_code: 'ATH', kma_name: 'Athens', latitude: 33.9519, longitude: -83.3576, distance_miles: 67.7 },
    { city: 'Dalton', state_or_province: 'GA', zip_code: '30720', kma_code: 'CHA', kma_name: 'Chattanooga', latitude: 34.7698, longitude: -84.9702, distance_miles: 74.8 },
    { city: 'Macon', state_or_province: 'GA', zip_code: '31201', kma_code: 'MCN', kma_name: 'Macon', latitude: 32.8407, longitude: -83.6324, distance_miles: 82.9 },
    { city: 'Augusta', state_or_province: 'GA', zip_code: '30901', kma_code: 'AGS', kma_name: 'Augusta', latitude: 33.4735, longitude: -81.9748, distance_miles: 144.8 },
    { city: 'Savannah', state_or_province: 'GA', zip_code: '31401', kma_code: 'SAV', kma_name: 'Savannah', latitude: 32.0809, longitude: -81.0912, distance_miles: 248.1 },
    { city: 'Columbus', state_or_province: 'GA', zip_code: '31901', kma_code: 'CSG', kma_name: 'Columbus', latitude: 32.4610, longitude: -84.9877, distance_miles: 108.3 },
    { city: 'Valdosta', state_or_province: 'GA', zip_code: '31601', kma_code: 'VLD', kma_name: 'Valdosta', latitude: 30.8327, longitude: -83.2785, distance_miles: 208.2 },
    { city: 'Albany', state_or_province: 'GA', zip_code: '31701', kma_code: 'ABY', kma_name: 'Albany', latitude: 31.5785, longitude: -84.1557, distance_miles: 146.9 },
    { city: 'Gainesville', state_or_province: 'GA', zip_code: '30501', kma_code: 'GVL', kma_name: 'Gainesville', latitude: 34.2978, longitude: -83.8241, distance_miles: 49.8 },
    { city: 'Brunswick', state_or_province: 'GA', zip_code: '31520', kma_code: 'BQK', kma_name: 'Brunswick', latitude: 31.1499, longitude: -81.4915, distance_miles: 276.1 }
  ],
  
  // Chicago coordinates: 41.878, -87.629
  chicago: [
    { city: 'Chicago', state_or_province: 'IL', zip_code: '60601', kma_code: 'CHI', kma_name: 'Chicago', latitude: 41.878, longitude: -87.629, distance_miles: 0 },
    { city: 'Evanston', state_or_province: 'IL', zip_code: '60201', kma_code: 'CHI', kma_name: 'Chicago', latitude: 42.0451, longitude: -87.6877, distance_miles: 12.6 },
    { city: 'Oak Park', state_or_province: 'IL', zip_code: '60302', kma_code: 'CHI', kma_name: 'Chicago', latitude: 41.8856, longitude: -87.7845, distance_miles: 8.9 },
    { city: 'Naperville', state_or_province: 'IL', zip_code: '60540', kma_code: 'CHI', kma_name: 'Chicago', latitude: 41.7508, longitude: -88.1535, distance_miles: 28.3 },
    { city: 'Joliet', state_or_province: 'IL', zip_code: '60431', kma_code: 'CHI', kma_name: 'Chicago', latitude: 41.525, longitude: -88.0817, distance_miles: 35.7 },
    { city: 'Gary', state_or_province: 'IN', zip_code: '46402', kma_code: 'CHI', kma_name: 'Chicago', latitude: 41.6021, longitude: -87.3372, distance_miles: 24.2 },
    { city: 'Milwaukee', state_or_province: 'WI', zip_code: '53202', kma_code: 'MKE', kma_name: 'Milwaukee', latitude: 43.0389, longitude: -87.9065, distance_miles: 82.4 },
    { city: 'Rockford', state_or_province: 'IL', zip_code: '61101', kma_code: 'RFD', kma_name: 'Rockford', latitude: 42.2711, longitude: -89.0937, distance_miles: 88.7 },
    { city: 'Madison', state_or_province: 'WI', zip_code: '53703', kma_code: 'MSN', kma_name: 'Madison', latitude: 43.0731, longitude: -89.4012, distance_miles: 132.6 },
    { city: 'South Bend', state_or_province: 'IN', zip_code: '46601', kma_code: 'SBN', kma_name: 'South Bend', latitude: 41.6764, longitude: -86.2520, distance_miles: 95.0 },
    { city: 'Peoria', state_or_province: 'IL', zip_code: '61602', kma_code: 'PIA', kma_name: 'Peoria', latitude: 40.6936, longitude: -89.5890, distance_miles: 167.0 },
    { city: 'Fort Wayne', state_or_province: 'IN', zip_code: '46802', kma_code: 'FWA', kma_name: 'Fort Wayne', latitude: 41.0793, longitude: -85.1394, distance_miles: 148.2 }
  ],
  
  // New York coordinates: 40.7128, -74.006
  newYork: [
    { city: 'New York', state_or_province: 'NY', zip_code: '10001', kma_code: 'NYC', kma_name: 'New York', latitude: 40.7128, longitude: -74.006, distance_miles: 0 },
    { city: 'Newark', state_or_province: 'NJ', zip_code: '07102', kma_code: 'NYC', kma_name: 'New York', latitude: 40.7357, longitude: -74.1724, distance_miles: 9.8 },
    { city: 'Jersey City', state_or_province: 'NJ', zip_code: '07306', kma_code: 'NYC', kma_name: 'New York', latitude: 40.7282, longitude: -74.0776, distance_miles: 4.2 },
    { city: 'Yonkers', state_or_province: 'NY', zip_code: '10701', kma_code: 'NYC', kma_name: 'New York', latitude: 40.9312, longitude: -73.8987, distance_miles: 15.9 },
    { city: 'New Haven', state_or_province: 'CT', zip_code: '06510', kma_code: 'BDR', kma_name: 'Bridgeport', latitude: 41.3083, longitude: -72.9279, distance_miles: 72.4 },
    { city: 'Trenton', state_or_province: 'NJ', zip_code: '08608', kma_code: 'PHL', kma_name: 'Philadelphia', latitude: 40.2206, longitude: -74.7597, distance_miles: 55.8 },
    { city: 'Philadelphia', state_or_province: 'PA', zip_code: '19107', kma_code: 'PHL', kma_name: 'Philadelphia', latitude: 39.9526, longitude: -75.1652, distance_miles: 91.1 },
    { city: 'Bridgeport', state_or_province: 'CT', zip_code: '06604', kma_code: 'BDR', kma_name: 'Bridgeport', latitude: 41.1865, longitude: -73.1952, distance_miles: 54.6 }
  ],
  
  // Los Angeles coordinates: 34.0522, -118.2437
  losAngeles: [
    { city: 'Los Angeles', state_or_province: 'CA', zip_code: '90001', kma_code: 'LAX', kma_name: 'Los Angeles', latitude: 34.0522, longitude: -118.2437, distance_miles: 0 },
    { city: 'Long Beach', state_or_province: 'CA', zip_code: '90802', kma_code: 'LAX', kma_name: 'Los Angeles', latitude: 33.7701, longitude: -118.1937, distance_miles: 20.1 },
    { city: 'Santa Monica', state_or_province: 'CA', zip_code: '90401', kma_code: 'LAX', kma_name: 'Los Angeles', latitude: 34.0195, longitude: -118.4912, distance_miles: 15.7 },
    { city: 'Anaheim', state_or_province: 'CA', zip_code: '92802', kma_code: 'LAX', kma_name: 'Los Angeles', latitude: 33.8366, longitude: -117.9143, distance_miles: 26.4 },
    { city: 'Riverside', state_or_province: 'CA', zip_code: '92501', kma_code: 'ONT', kma_name: 'Ontario', latitude: 33.9806, longitude: -117.3755, distance_miles: 54.2 },
    { city: 'San Bernardino', state_or_province: 'CA', zip_code: '92401', kma_code: 'ONT', kma_name: 'Ontario', latitude: 34.1083, longitude: -117.2898, distance_miles: 59.6 },
    { city: 'Oxnard', state_or_province: 'CA', zip_code: '93030', kma_code: 'OXR', kma_name: 'Oxnard', latitude: 34.1975, longitude: -119.1771, distance_miles: 61.3 },
    { city: 'Bakersfield', state_or_province: 'CA', zip_code: '93301', kma_code: 'BFL', kma_name: 'Bakersfield', latitude: 35.3733, longitude: -119.0187, distance_miles: 100.9 }
  ],
  
  // Dallas coordinates: 32.7767, -96.797
  dallas: [
    { city: 'Dallas', state_or_province: 'TX', zip_code: '75201', kma_code: 'DFW', kma_name: 'Dallas-Fort Worth', latitude: 32.7767, longitude: -96.797, distance_miles: 0 },
    { city: 'Fort Worth', state_or_province: 'TX', zip_code: '76102', kma_code: 'DFW', kma_name: 'Dallas-Fort Worth', latitude: 32.7555, longitude: -97.3308, distance_miles: 30.2 },
    { city: 'Arlington', state_or_province: 'TX', zip_code: '76010', kma_code: 'DFW', kma_name: 'Dallas-Fort Worth', latitude: 32.7357, longitude: -97.1081, distance_miles: 20.5 },
    { city: 'Plano', state_or_province: 'TX', zip_code: '75023', kma_code: 'DFW', kma_name: 'Dallas-Fort Worth', latitude: 33.0198, longitude: -96.6989, distance_miles: 19.7 },
    { city: 'Denton', state_or_province: 'TX', zip_code: '76201', kma_code: 'DFW', kma_name: 'Dallas-Fort Worth', latitude: 33.2148, longitude: -97.1331, distance_miles: 38.1 },
    { city: 'Waco', state_or_province: 'TX', zip_code: '76701', kma_code: 'ACT', kma_name: 'Waco', latitude: 31.5493, longitude: -97.1467, distance_miles: 86.1 },
    { city: 'Tyler', state_or_province: 'TX', zip_code: '75701', kma_code: 'TYR', kma_name: 'Tyler', latitude: 32.3513, longitude: -95.3011, distance_miles: 93.2 },
    { city: 'Sherman', state_or_province: 'TX', zip_code: '75090', kma_code: 'SHM', kma_name: 'Sherman', latitude: 33.6357, longitude: -96.6089, distance_miles: 65.3 }
  ],
  
  // Miami coordinates: 25.7617, -80.1918
  miami: [
    { city: 'Miami', state_or_province: 'FL', zip_code: '33101', kma_code: 'MIA', kma_name: 'Miami', latitude: 25.7617, longitude: -80.1918, distance_miles: 0 },
    { city: 'Fort Lauderdale', state_or_province: 'FL', zip_code: '33301', kma_code: 'MIA', kma_name: 'Miami', latitude: 26.1224, longitude: -80.1373, distance_miles: 27.5 },
    { city: 'West Palm Beach', state_or_province: 'FL', zip_code: '33401', kma_code: 'WPB', kma_name: 'West Palm Beach', latitude: 26.7153, longitude: -80.0534, distance_miles: 68.1 },
    { city: 'Key West', state_or_province: 'FL', zip_code: '33040', kma_code: 'EYW', kma_name: 'Key West', latitude: 24.5551, longitude: -81.7800, distance_miles: 129.3 },
    { city: 'Naples', state_or_province: 'FL', zip_code: '34102', kma_code: 'APF', kma_name: 'Naples', latitude: 26.1420, longitude: -81.7948, distance_miles: 124.4 },
    { city: 'Fort Myers', state_or_province: 'FL', zip_code: '33901', kma_code: 'FMY', kma_name: 'Fort Myers', latitude: 26.6406, longitude: -81.8723, distance_miles: 151.2 },
    { city: 'Port St. Lucie', state_or_province: 'FL', zip_code: '34952', kma_code: 'FPR', kma_name: 'Fort Pierce', latitude: 27.2730, longitude: -80.3535, distance_miles: 112.3 },
    { city: 'Fort Pierce', state_or_province: 'FL', zip_code: '34950', kma_code: 'FPR', kma_name: 'Fort Pierce', latitude: 27.4467, longitude: -80.3256, distance_miles: 122.5 }
  ]
};

// Helper function to get city data by name and state
export function getMockCityData(cityName, stateCode) {
  const cityKey = cityName.toLowerCase();
  const cityMap = {
    'atlanta': mockCities.atlanta,
    'chicago': mockCities.chicago,
    'new york': mockCities.newYork,
    'los angeles': mockCities.losAngeles,
    'dallas': mockCities.dallas,
    'miami': mockCities.miami
  };
  
  if (cityKey in cityMap) {
    return cityMap[cityKey];
  }
  
  // For other cities, return null
  return null;
}