// scripts/client-side-test.js
// This script simulates the frontend calls to the intelligence-pairing API

import fetch from 'node-fetch';

// Base URL for API calls
const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';

// Test cases that match the frontend's actual request format
const testCases = [
  {
    name: "Frontend Format 1 (from console logs)",
    payload: {
      laneId: "test-lane-1",
      originCity: "Pasco",
      originState: "WA",
      originZip: "",
      destinationCity: "Vancouver",
      destinationState: "WA",
      destinationZip: "",
      equipmentCode: "V"
    }
  },
  {
    name: "Frontend Format 2 (from logs)",
    payload: {
      laneId: "test-lane-2",
      originCity: "Russellville",
      originState: "AR",
      originZip: "",
      destinationCity: "Frisco",
      destinationState: "TX",
      destinationZip: "",
      equipmentCode: "V"
    }
  },
  {
    name: "Mixed field format",
    payload: {
      lane_id: "test-lane-3",
      origin_city: "Cincinnati",
      origin_state: "OH",
      origin_zip: "",
      dest_city: "Philadelphia",
      dest_state: "PA",
      dest_zip: "",
      equipment_code: "V"
    }
  },
  {
    name: "Explicit test mode",
    payload: {
      originCity: "Chicago",
      originState: "IL",
      destinationCity: "Atlanta",
      destinationState: "GA",
      equipmentCode: "V",
      test_mode: true
    }
  },
  {
    name: "Explicit dest_ prefix",
    payload: {
      originCity: "Denver",
      originState: "CO",
      dest_city: "Dallas",
      dest_state: "TX",
      equipmentCode: "V"
    }
  }
];

// Function to test a single case
async function testCase(testCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log(`📦 Payload: ${JSON.stringify(testCase.payload)}`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.payload)
    });
    
    console.log(`📥 Response status: ${response.status} ${response.statusText}`);
    
    // Try to parse the response
    try {
      const data = await response.json();
      console.log(`📄 Response data: ${JSON.stringify(data, null, 2)}`);
      return { success: response.ok, status: response.status, data };
    } catch (e) {
      console.error(`❌ Failed to parse response: ${e.message}`);
      return { success: false, status: response.status, error: e.message };
    }
  } catch (error) {
    console.error(`❌ Request error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Function to run all tests
async function runTests() {
  console.log('🚀 Starting client-side API tests');
  
  for (const testCase of testCases) {
    await testCase(testCase);
  }
  
  console.log('\n✅ All tests completed');
}

// Run the tests
runTests().catch(e => console.error('Test runner error:', e));