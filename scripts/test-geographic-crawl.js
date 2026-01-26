// scripts/test-geographic-crawl.js
// This script tests the geographic crawl function directly without going through the API
// It's useful for isolating issues between the API handling and the crawl function itself

import { generateGeographicCrawlPairs } from '../lib/geographicCrawl.js';
import { adminSupabase } from '../utils/supabaseClient.js';

// Test lanes
const testLanes = [
  {
    originCity: 'Pasco',
    originState: 'WA',
    destCity: 'Vancouver', 
    destState: 'WA',
    equipmentCode: 'V'
  },
  {
    originCity: 'Russellville',
    originState: 'AR',
    destCity: 'Frisco',
    destState: 'TX',
    equipmentCode: 'V'
  },
  {
    originCity: 'Cincinnati',
    originState: 'OH',
    destCity: 'Philadelphia',
    destState: 'PA',
    equipmentCode: 'V'
  }
];

// Function to test a single lane
async function testLane(lane) {
  console.log(`\n🧪 Testing lane: ${lane.originCity}, ${lane.originState} → ${lane.destCity}, ${lane.destState}`);
  
  try {
    // Call the function directly
    const result = await generateGeographicCrawlPairs(lane, adminSupabase);
    
    // Log results
    console.log(`✅ Success! Generated ${result?.pairs?.length || 0} pairs`);
    
    // Count unique KMAs
    const kmas = new Set();
    if (result?.pairs) {
      result.pairs.forEach(pair => {
        if (pair.originKma) kmas.add(pair.originKma);
        if (pair.destKma) kmas.add(pair.destKma);
      });
    }
    
    console.log(`🧩 Found ${kmas.size} unique KMAs: ${[...kmas].join(', ')}`);
    
    return { success: true, pairs: result?.pairs || [], uniqueKmas: kmas.size };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main function to run all tests
async function runTests() {
  console.log('🚀 Starting geographic crawl tests');
  
  const results = [];
  
  // Test each lane
  for (const lane of testLanes) {
    const result = await testLane(lane);
    results.push({
      lane,
      success: result.success,
      pairCount: result.pairs?.length || 0,
      uniqueKmas: result.uniqueKmas || 0,
      error: result.error
    });
  }
  
  // Print summary
  console.log('\n📊 Test Summary:');
  results.forEach((result, index) => {
    const lane = result.lane;
    console.log(`${index + 1}. ${lane.originCity}, ${lane.originState} → ${lane.destCity}, ${lane.destState}: ${result.success ? '✅ Success' : '❌ Failed'}`);
    if (result.success) {
      console.log(`   ${result.pairCount} pairs, ${result.uniqueKmas} unique KMAs`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
  });
}

// Run tests
runTests().catch(e => console.error('Test suite error:', e));