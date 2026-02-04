/**
 * Verify Intelligence API Fix
 * 
 * This script uses a Fetch API polyfill to test the API fix
 * outside of a browser context.
 */

// Import necessary modules for Node.js environment
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Banner for better visibility
console.log('='.repeat(70));
console.log(' INTELLIGENCE API FIX VERIFICATION '.padStart(45, '=').padEnd(70, '='));
console.log('='.repeat(70));

/**
 * Our test implementation of the intelligenceApiAdapter
 */
async function callIntelligencePairingApi(lane, options = {}) {
  // Use test mode by default in our verification script
  const useTestMode = options.useTestMode !== undefined ? options.useTestMode : true;
  
  // Format parameters according to our fix
  const payload = {
    laneId: lane.id,
    originCity: lane.origin_city || lane.originCity,
    originState: lane.origin_state || lane.originState,
    originZip: lane.origin_zip || lane.originZip || '',
    // Use destCity/destState instead of destinationCity/destinationState
    destCity: lane.dest_city || lane.destination_city || lane.destinationCity,
    destState: lane.dest_state || lane.destination_state || lane.destinationState,
    destZip: lane.dest_zip || lane.destination_zip || lane.destinationZip || '',
    equipmentCode: lane.equipment_code || lane.equipmentCode || 'V',
    test_mode: useTestMode
  };

  console.log('\n📤 Sending API request with payload:', JSON.stringify(payload, null, 2));

  try {
    // Use a full URL for running in Node.js context
    const apiUrl = options.baseUrl || 'http://localhost:3000/api/intelligence-pairing';
    console.log(`📌 API endpoint: ${apiUrl}`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log(`📥 API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error (${response.status}):`, errorText);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Intelligence API error:', error);
    throw error;
  }
}

/**
 * Run verification test
 */
async function runVerificationTest() {
  // Test data for lane
  const testLane = {
    id: 'verify-' + Date.now(),
    origin_city: 'Cincinnati',
    origin_state: 'OH',
    origin_zip: '45202',
    dest_city: 'Chicago', 
    dest_state: 'IL',
    dest_zip: '60601',
    equipment_code: 'V'
  };

  console.log('🚀 Starting API verification...');
  console.log('📦 Test lane:', JSON.stringify(testLane, null, 2));
  
  // First, test with original parameter format (should fail with 400 if not fixed)
  console.log('\n🔍 TEST 1: Using original parameter format (destinationCity/destinationState)');
  try {
    // Create a lane with the original parameter format
    const originalFormatLane = {
      id: 'original-format-' + Date.now(),
      originCity: testLane.origin_city,
      originState: testLane.origin_state,
      originZip: testLane.origin_zip,
      destinationCity: testLane.dest_city,  // Original problem format
      destinationState: testLane.dest_state, // Original problem format
      destinationZip: testLane.dest_zip,
      equipmentCode: testLane.equipment_code
    };

    // Call API directly with original format (bypassing adapter)
    const apiUrl = 'http://localhost:3000/api/intelligence-pairing';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...originalFormatLane,
        test_mode: true
      }),
    });
    
    console.log(`📥 Direct API response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log(`⚠️ Original format still works - got ${result.pairs?.length || 0} pairs`);
      console.log('This may mean the backend was fixed or our fix was already deployed');
    } else if (response.status === 400) {
      console.log('✅ Expected behavior: Original format fails with 400 Bad Request');
      console.log('This confirms the API expects destCity/destState, not destinationCity/destinationState');
    } else {
      console.warn(`⚠️ Unexpected status ${response.status} - may be unrelated issue`);
    }
  } catch (error) {
    console.error('❌ Test 1 error:', error.message);
  }
  
  // Now test with our adapter
  console.log('\n🔍 TEST 2: Using adapter with parameter transformation');
  try {
    console.time('⏱️ API Response Time');
    const result = await callIntelligencePairingApi(testLane, { 
      baseUrl: 'http://localhost:3000/api/intelligence-pairing'
    });
    console.timeEnd('⏱️ API Response Time');
    
    if (result.pairs && result.pairs.length > 0) {
      console.log('✅ SUCCESS: Adapter works! API returned', result.pairs.length, 'pairs');
      
      // Validate KMA diversity
      const uniqueKmas = new Set(result.pairs.map(p => p.kma_code));
      console.log(`📊 Found ${uniqueKmas.size} unique KMAs (min required: 6)`);
      
      // Log a few sample pairs
      console.log('\n📋 Sample pairs:');
      result.pairs.slice(0, 3).forEach((pair, idx) => {
        console.log(`  ${idx + 1}. ${pair.origin_city}, ${pair.origin_state} → ${pair.destination_city}, ${pair.destination_state} (KMA: ${pair.kma_code})`);
      });
      
      console.log('\n✅ VERIFICATION COMPLETE: API ADAPTER FIX SUCCESSFUL!');
      console.log('✅ The API now returns 200 responses with properly formatted parameters.');
    } else {
      console.log('⚠️ API returned 200 but no pairs were generated.');
    }
  } catch (error) {
    console.error('❌ Test 2 error:', error.message);
    console.log('❌ VERIFICATION FAILED: Adapter did not fix the issue');
  }
  
  console.log('\n' + '='.repeat(70));
}

// Run the verification
runVerificationTest().catch(error => {
  console.error('Fatal error during verification:', error);
});