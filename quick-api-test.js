#!/usr/bin/env node
/**
 * Simplified RapidRoutes Intelligence API Test
 * Uses direct fetch with minimal dependencies
 */

const fetch = require('node-fetch');

// Test configuration
const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';

// Test with mock auth enabled (if supported in the environment)
const TEST_LANE = {
  originCity: "Chicago",
  originState: "IL",
  originZip: "60601",
  destCity: "Atlanta", 
  destState: "GA",
  destZip: "30303",
  equipmentCode: "FD",
  mock_auth: true // Enable mock authentication if supported by the API
};

// Run API test
async function testApi() {
  console.log('🔍 TESTING INTELLIGENCE API');
  console.log('========================');
  console.log(`🌐 API: ${API_URL}`);
  console.log(`🚚 Lane: ${TEST_LANE.originCity}, ${TEST_LANE.originState} to ${TEST_LANE.destCity}, ${TEST_LANE.destState}`);
  console.log('📡 Sending request...');

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_LANE)
    });

    console.log(`⏱️ Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API ERROR:');
      console.error(errorText);
      process.exit(1);
    }

    const data = await response.json();
    
    // Basic validation
    if (!data.pairs || !Array.isArray(data.pairs)) {
      console.error('❌ Invalid response format: missing or invalid pairs array');
      process.exit(1);
    }

    // Count KMAs
    const kmas = new Set();
    data.pairs.forEach(pair => {
      if (pair.origin?.kma_code) kmas.add(pair.origin.kma_code);
      if (pair.destination?.kma_code) kmas.add(pair.destination.kma_code);
    });

    console.log('✅ TEST SUCCESSFUL');
    console.log('----------------');
    console.log(`📊 Received ${data.pairs.length} pairs`);
    console.log(`🌍 Unique KMAs: ${kmas.size} (${Array.from(kmas).join(', ')})`);
    console.log(`✅ KMA diversity requirement: ${kmas.size >= 6 ? 'PASSED' : 'FAILED'} (${kmas.size}/6)`);
    
    return {
      success: true,
      pairsCount: data.pairs.length,
      uniqueKmas: kmas.size,
      kmaList: Array.from(kmas)
    };
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }
}

// Execute test
testApi();