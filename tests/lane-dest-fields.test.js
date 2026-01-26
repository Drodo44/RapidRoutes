/**
 * Lane API Destination Field Mapping Test
 * Tests the proper mapping of various destination field formats in lane API
 */

import fetch from 'node-fetch';

// Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const TEST_TOKEN = process.env.TEST_AUTH_TOKEN || 'test-token'; // Replace with actual test token

// Test cases for destination field formats
const TEST_CASES = [
  {
    name: 'Standard destination_* fields',
    payload: {
      origin_city: 'Chicago',
      origin_state: 'IL',
      origin_zip: '60601',
      destination_city: 'New York',
      destination_state: 'NY',
      equipment_code: 'V',
      weight_lbs: 5000,
      pickup_earliest: new Date().toISOString()
    },
    expectedDestFields: {
      destination_city: 'New York',
      destination_state: 'NY'
    }
  },
  {
    name: 'Legacy dest_* fields',
    payload: {
      origin_city: 'Los Angeles',
      origin_state: 'CA',
      origin_zip: '90001',
      dest_city: 'Dallas',
      dest_state: 'TX',
      equipment_code: 'FD',
      weight_lbs: 4000,
      pickup_earliest: new Date().toISOString()
    },
    expectedDestFields: {
      destination_city: 'Dallas',
      destination_state: 'TX'
    }
  },
  {
    name: 'Mixed field formats',
    payload: {
      origin_city: 'Seattle',
      origin_state: 'WA',
      origin_zip: '98101',
      destination_city: 'Portland',
      dest_state: 'OR',
      equipment_code: 'R',
      weight_lbs: 6000,
      pickup_earliest: new Date().toISOString()
    },
    expectedDestFields: {
      destination_city: 'Portland',
      destination_state: 'OR'
    }
  },
  {
    name: 'Partial destination (city only)',
    payload: {
      origin_city: 'Miami',
      origin_state: 'FL',
      origin_zip: '33101',
      dest_city: 'Atlanta',
      equipment_code: 'V',
      weight_lbs: 3000,
      pickup_earliest: new Date().toISOString()
    },
    expectedDestFields: {
      destination_city: 'Atlanta',
      destination_state: null
    }
  },
  {
    name: 'Partial destination (state only)',
    payload: {
      origin_city: 'Boston',
      origin_state: 'MA',
      origin_zip: '02108',
      dest_state: 'NH',
      equipment_code: 'FD',
      weight_lbs: 2000,
      pickup_earliest: new Date().toISOString()
    },
    expectedDestFields: {
      destination_city: null,
      destination_state: 'NH'
    }
  }
];

/**
 * Run the test cases against the lane API
 */
async function runTests() {
  console.log(`🧪 Lane API Destination Field Mapping Test`);
  console.log(`======================================`);
  console.log(`Target API: ${API_URL}/api/lanes`);
  console.log(`Test cases: ${TEST_CASES.length}`);
  console.log();

  let passCount = 0;
  let failCount = 0;
  
  for (const testCase of TEST_CASES) {
    console.log(`📋 Testing: ${testCase.name}`);
    
    try {
      const response = await fetch(`${API_URL}/api/lanes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        body: JSON.stringify(testCase.payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.log(`❌ Error response: ${response.status} ${response.statusText}`);
        console.log(`Details:`, data);
        failCount++;
        continue;
      }
      
      // Check if destination fields were properly mapped
      const destinationCityMatches = 
        data.destination_city === testCase.expectedDestFields.destination_city;
      const destinationStateMatches = 
        data.destination_state === testCase.expectedDestFields.destination_state;
      
      if (destinationCityMatches && destinationStateMatches) {
        console.log(`✅ Success: Destination fields correctly mapped`);
        console.log(`   Expected: ${JSON.stringify(testCase.expectedDestFields)}`);
        console.log(`   Received: destination_city=${data.destination_city}, destination_state=${data.destination_state}`);
        passCount++;
      } else {
        console.log(`❌ Fail: Destination field mapping incorrect`);
        console.log(`   Expected: ${JSON.stringify(testCase.expectedDestFields)}`);
        console.log(`   Received: destination_city=${data.destination_city}, destination_state=${data.destination_state}`);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
      failCount++;
    }
    
    console.log(`--------------------------------------`);
  }
  
  console.log(`\n📊 Results: ${passCount} passed, ${failCount} failed`);
  console.log(`${passCount === TEST_CASES.length ? '✅ All tests passed!' : '⚠️ Some tests failed'}`);
}

// Only run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

export { TEST_CASES };