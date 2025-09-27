// api-verification-test.js
// Script to test the intelligence-pairing API endpoint
// Usage: node api-verification-test.js

import fetch from 'node-fetch';
import 'dotenv/config';

// Target URL
const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';
const LOCAL_URL = 'http://localhost:3000/api/intelligence-pairing';

// Test if we can use test_mode for verification without auth
const USE_TEST_MODE = true;

// Get auth token from environment or command line
const AUTH_TOKEN = process.env.AUTH_TOKEN || process.argv[2];

// Verify we have an auth token if not using test_mode
if (!AUTH_TOKEN && !USE_TEST_MODE) {
  console.error('❌ No auth token provided. Please set AUTH_TOKEN env var or provide as argument.');
  console.error('Usage: node api-verification-test.js YOUR_AUTH_TOKEN');
  process.exit(1);
}

// Test lane data
const testLanes = [
  {
    id: 'test1',
    originCity: 'Atlanta',
    originState: 'GA',
    destinationCity: 'Chicago',
    destinationState: 'IL',
    equipmentCode: 'V'
  },
  {
    id: 'test2',
    originCity: 'Seattle',
    originState: 'WA',
    destinationCity: 'Miami',
    destinationState: 'FL',
    equipmentCode: 'R'
  },
  {
    id: 'test3',
    originCity: 'Denver',
    originState: 'CO',
    destinationCity: 'Dallas',
    destinationState: 'TX',
    equipmentCode: 'FD'
  },
  // Added lanes from the logs in the original request
  {
    id: '282481ae-48d1-43a9-abf7-d7ecf490ff22',
    originCity: 'Newberry',
    originState: 'SC',
    destinationCity: 'Altamont',
    destinationState: 'NY',
    equipmentCode: 'FD'
  },
  {
    id: 'f25c40fe-7288-4dcc-850a-0d8ac26ea85b',
    originCity: 'Riegelwood',
    originState: 'NC',
    destinationCity: 'North East',
    destinationState: 'MD',
    equipmentCode: 'FD'
  }
];

// Test function
async function testApiEndpoint() {
  console.log('🔍 Starting API verification test...');
  console.log(`🌐 Using API endpoint: ${API_URL}`);
  console.log(AUTH_TOKEN 
    ? `🔐 Using auth token: ${AUTH_TOKEN.substring(0, 10)}...`
    : `⚠️ No auth token provided, using test_mode: ${USE_TEST_MODE}`);

  let successCount = 0;
  let failCount = 0;
  
  // Run tests for each lane
  for (const lane of testLanes) {
    try {
      console.log(`\n🔄 Testing lane: ${lane.id} - ${lane.originCity}, ${lane.originState} → ${lane.destinationCity}, ${lane.destinationState}`);
      
      // Make the request with appropriate headers
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add auth token if available
      if (AUTH_TOKEN) {
        headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
      }
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          lane_id: lane.id,
          origin_city: lane.originCity,
          origin_state: lane.originState,
          destination_city: lane.destinationCity,
          destination_state: lane.destinationState,
          equipment_code: lane.equipmentCode,
          debug: true,  // Enable debug mode for more details
          test_mode: USE_TEST_MODE  // Enable test mode if no auth token
        })
      });
      
      // Check response status
      const statusText = response.ok ? '✅' : '❌';
      console.log(`${statusText} Status code: ${response.status}`);
      
      // Parse response body
      const data = await response.json();
      
      // If we have pairs, consider this a success
      if (data.pairs && Array.isArray(data.pairs)) {
        console.log(`📊 Generated ${data.pairs.length} pairs`);
        if (data.pairs.length > 0) {
          console.log(`📍 First pair: ${data.pairs[0].origin_city}, ${data.pairs[0].origin_state} → ${data.pairs[0].destination_city}, ${data.pairs[0].destination_state}`);
          console.log(`💲 Rate: $${data.pairs[0].rate} ($${data.pairs[0].rate_per_mile}/mile)`);
          successCount++;
        } else {
          console.log(`⚠️ Zero pairs generated`);
          failCount++;
        }
      } else {
        console.error(`❌ Invalid response format: No pairs array found`);
        console.error(`Response: ${JSON.stringify(data, null, 2).substring(0, 500)}...`);
        failCount++;
      }
    } catch (error) {
      console.error(`❌ Test failed for ${lane.id}: ${error.message}`);
      failCount++;
    }
  }
  
  // Print summary
  console.log(`\n====== TEST SUMMARY ======`);
  console.log(`✅ Successes: ${successCount}`);
  console.log(`❌ Failures: ${failCount}`);
  console.log(`📊 Success rate: ${Math.round((successCount / testLanes.length) * 100)}%`);
}

// Run the test
testApiEndpoint()
  .then(() => console.log('✨ API verification test completed'))
  .catch(error => console.error('💥 Test runner failed:', error));