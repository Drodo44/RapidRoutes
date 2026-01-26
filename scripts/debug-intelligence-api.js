// debug-intelligence-api.js
// Temporary debug file to diagnose the 400 Bad Request error
// This file should NOT be used in production - it's for debugging only

// Import fetch for making requests
import fetch from 'node-fetch';

// Define test lanes for debugging
const testLanes = [
  {
    // Example from console logs: Pasco, WA → Vancouver, WA
    originCity: 'Pasco',
    originState: 'WA',
    destinationCity: 'Vancouver', 
    destinationState: 'WA',
    equipmentCode: 'V' // Explicitly add equipment code
  },
  {
    // Example from console logs: Russellville, AR → Frisco, TX
    originCity: 'Russellville',
    originState: 'AR',
    destinationCity: 'Frisco',
    destinationState: 'TX',
    equipmentCode: 'V' // Explicitly add equipment code
  },
  {
    // Same data but with snake_case keys to test different formatting
    origin_city: 'Cincinnati',
    origin_state: 'OH',
    destination_city: 'Philadelphia',
    destination_state: 'PA',
    equipment_code: 'V'
  }
];

// Function to test the API with different request bodies
async function testApi(lane, testMode = false, includeAuth = false) {
  console.log(`\n🧪 Testing API with lane: ${lane.originCity || lane.origin_city}, ${lane.originState || lane.origin_state} → ${lane.destinationCity || lane.destination_city}, ${lane.destinationState || lane.destination_state}`);
  
  // Clone the lane object to avoid modifying the original
  const payload = { ...lane };
  
  // Add test_mode flag if requested
  if (testMode) {
    payload.test_mode = true;
  }
  
  console.log('📦 Request payload:', JSON.stringify(payload, null, 2));
  
  // Headers for the request
  const headers = {
    'Content-Type': 'application/json'
  };
  
  // Add auth header if requested (for completeness, though we're using test mode)
  if (includeAuth) {
    headers['Authorization'] = 'Bearer mock-token-for-testing';
  }
  
  try {
    // Make the request to the local API endpoint
    const response = await fetch('http://localhost:3000/api/intelligence-pairing', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    console.log(`📥 API response status: ${response.status} ${response.statusText}`);
    
    // Try to parse the response as JSON
    let data;
    try {
      data = await response.json();
      console.log('📄 Response data:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('⚠️ Could not parse response as JSON:', e.message);
    }
    
    return { status: response.status, data };
  } catch (error) {
    console.error('❌ Error calling API:', error.message);
    return { status: 500, error: error.message };
  }
}

// Function to test all lanes
async function runTests() {
  console.log('🚀 Starting API tests');
  
  // Test with each lane
  for (const lane of testLanes) {
    // Test with test_mode = true
    await testApi(lane, true, false);
    
    // Test with test_mode = false and auth
    await testApi(lane, false, true);
  }
  
  console.log('\n✅ All tests completed');
}

// Export for use in other files
export { testApi, runTests };

// Run the tests when executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTests().catch(e => console.error('Test suite error:', e));
}