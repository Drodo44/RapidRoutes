/**
 * Comprehensive API verification script
 * 
 * This script tests the intelligence-pairing API with various payload formats
 * to identify the exact requirements for a successful request.
 */

import fetch from 'node-fetch';

// Test configurations
const TEST_PAYLOADS = [
  {
    name: 'Snake Case Keys',
    payload: {
      "origin_city": "Pasco",
      "origin_state": "WA",
      "dest_city": "Vancouver",
      "dest_state": "WA",
      "equipment_code": "FD"
    }
  },
  {
    name: 'Camel Case Keys',
    payload: {
      "originCity": "Pasco",
      "originState": "WA",
      "destCity": "Vancouver",
      "destState": "WA",
      "equipmentCode": "FD"
    }
  },
  {
    name: 'Mixed Format (camel + snake)',
    payload: {
      "originCity": "Pasco",
      "origin_state": "WA",
      "destCity": "Vancouver",
      "dest_state": "WA",
      "equipment_code": "FD"
    }
  },
  {
    name: 'With Test Mode',
    payload: {
      "origin_city": "Pasco",
      "origin_state": "WA",
      "dest_city": "Vancouver",
      "dest_state": "WA",
      "equipment_code": "FD",
      "test_mode": true
    }
  }
];

// Mock token for local API testing
// In production, this would be retrieved securely
const MOCK_AUTH_TOKEN = 'test-token-12345';

/**
 * Test the API with multiple payload formats
 */
async function runApiTests() {
  console.log('🧪 Running comprehensive API verification tests');
  
  for (const test of TEST_PAYLOADS) {
    console.log(`\n🔍 Test: ${test.name}`);
    console.log('📤 Sending payload:');
    console.log(JSON.stringify(test.payload, null, 2));
    
    try {
      const response = await fetch('https://rapid-routes.vercel.app/api/intelligence-pairing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MOCK_AUTH_TOKEN}`
        },
        body: JSON.stringify(test.payload),
      });

      const status = response.status;
      console.log(`📥 Response status: ${status}`);
      
      let responseData;
      try {
        responseData = await response.json();
        console.log(JSON.stringify(responseData, null, 2));
      } catch {
        const text = await response.text();
        console.log(text);
        responseData = { error: text };
      }
      
      console.log(`⏱️ Test result: ${response.ok ? '✅ SUCCESS' : '❌ FAILED'}`);
      
      if (!response.ok && responseData.details) {
        console.error(`❌ Failure details: ${responseData.details}`);
      }
    } catch (error) {
      console.error(`❌ Network error: ${error.message}`);
    }
  }
  
  console.log('\n🔬 Key findings:');
  console.log('1. Check the successful vs failed formats above');
  console.log('2. These are the required fields from docs/curl examples:');
  console.log('   - origin_city, origin_state, dest_city, dest_state, equipment_code');
  console.log('3. Next steps: Update the adapter based on these findings');
}

// Run the tests
runApiTests()
  .then(() => {
    console.log('\n✅ API verification tests completed');
    console.log('Review the results to determine the exact API requirements');
  })
  .catch(err => {
    console.error('Script execution failed:', err);
  });