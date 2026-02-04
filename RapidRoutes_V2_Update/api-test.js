// api-test.js - Test script for the intelligence-pairing API endpoint
// Run with: node api-test.js

const fetch = require('node-fetch');

// Configuration
const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';
const TEST_TOKEN = process.env.TEST_TOKEN || '';
const DEBUG_MODE = true;

// Test cases with known city pairs
const TEST_CASES = [
  {
    name: 'Chicago to Atlanta',
    payload: {
      origin_city: 'Chicago',
      origin_state: 'IL',
      destination_city: 'Atlanta', 
      destination_state: 'GA',
      equipment_code: 'V',
      test_mode: true,
      debug_env: true
    }
  },
  {
    name: 'Los Angeles to Dallas',
    payload: {
      origin_city: 'Los Angeles',
      origin_state: 'CA',
      destination_city: 'Dallas', 
      destination_state: 'TX',
      equipment_code: 'FD',
      test_mode: true,
      debug_env: true
    }
  },
  {
    name: 'New York to Miami',
    payload: {
      origin_city: 'New York',
      origin_state: 'NY',
      destination_city: 'Miami', 
      destination_state: 'FL',
      equipment_code: 'R',
      test_mode: true,
      debug_env: true
    }
  }
];

// Run tests
async function runTests() {
  console.log(`🧪 Testing API: ${API_URL}`);
  
  // First, try a direct debug request
  try {
    console.log('\n🔍 Testing debug endpoint...');
    
    const debugResponse = await fetch(`${API_URL}?debug=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': TEST_TOKEN ? `Bearer ${TEST_TOKEN}` : undefined,
        'X-Debug-Env': 'true'
      },
      body: JSON.stringify({ debug: true, test_mode: true })
    });
    
    const debugData = await debugResponse.json();
    
    console.log(`✅ Debug response status: ${debugResponse.status}`);
    console.log('Environment:', debugData.environment);
    console.log('Database:', debugData.database);
    console.log('API Version:', debugData.api_version);
    
    // Check database connectivity
    if (debugData.database?.connected) {
      console.log(`✅ Database connected, ${debugData.database.cityCount} cities available`);
    } else {
      console.log('❌ Database connection failed');
    }
  } catch (debugError) {
    console.error('❌ Debug test failed:', debugError.message);
  }
  
  // Run individual test cases
  for (const test of TEST_CASES) {
    console.log(`\n🧪 Testing case: ${test.name}`);
    
    try {
      const startTime = Date.now();
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': TEST_TOKEN ? `Bearer ${TEST_TOKEN}` : undefined
        },
        body: JSON.stringify(test.payload)
      });
      
      const responseTime = Date.now() - startTime;
      
      // Check status
      if (response.ok) {
        console.log(`✅ Status: ${response.status} (${responseTime}ms)`);
      } else {
        console.log(`❌ Status: ${response.status} (${responseTime}ms)`);
      }
      
      // Parse response
      const data = await response.json();
      
      if (data.success) {
        // Success - log pair count
        console.log(`✅ Pairs generated: ${data.pairs?.length || 0}`);
        console.log(`✅ Unique KMAs: ${data.stats?.unique_kmas || 'N/A'}`);
        
        if (DEBUG_MODE && data.pairs && data.pairs.length > 0) {
          console.log('📋 Sample pair:', {
            origin: `${data.pairs[0].origin_city}, ${data.pairs[0].origin_state}`,
            destination: `${data.pairs[0].destination_city}, ${data.pairs[0].destination_state}`,
            distance: `${data.pairs[0].distance_miles} miles`,
            rate: `$${data.pairs[0].rate}`,
            carrier: data.pairs[0].carrier?.name
          });
        }
      } else {
        // Error - log details
        console.log(`❌ Error: ${data.error}`);
        console.log('Details:', data.details || 'No details provided');
      }
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
  }
  
  console.log('\n🏁 Testing completed');
}

runTests().catch(console.error);