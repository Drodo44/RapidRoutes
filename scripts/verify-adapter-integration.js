/**
 * Verify Intelligence API Integration
 * 
 * This script tests the adapter implementation by making a test call
 * to the intelligence-pairing API and verifying the response.
 */

import { callIntelligencePairingApi } from '../utils/intelligenceApiAdapter.js';

// Test data for a lane
const testLane = {
  id: 'test-' + Date.now(),
  origin_city: 'Cincinnati',
  origin_state: 'OH',
  origin_zip: '45202',
  dest_city: 'Chicago', 
  dest_state: 'IL',
  dest_zip: '60601',
  equipment_code: 'V'
};

// Console banner for better visibility
console.log('='.repeat(50));
console.log('INTELLIGENCE API ADAPTER VALIDATION TEST');
console.log('='.repeat(50));

/**
 * Run the test
 */
async function runValidationTest() {
  console.log('🚀 Starting API adapter test...');
  console.log('📦 Using test lane:', testLane);
  
  try {
    console.time('⏱️ API Response Time');
    
    // Call the API using our adapter
    const result = await callIntelligencePairingApi(testLane, {
      // Enable test mode for validation
      useTestMode: true
    });
    
    console.timeEnd('⏱️ API Response Time');
    
    // Check if pairs were returned
    if (result && result.pairs) {
      console.log('✅ SUCCESS: API returned', result.pairs.length, 'pairs');
      
      // Validate if we have enough unique KMAs
      const uniqueKmas = new Set(result.pairs.map(p => p.kma_code));
      console.log(`📊 Found ${uniqueKmas.size} unique KMAs`);
      
      if (uniqueKmas.size >= 6) {
        console.log('✅ SUCCESS: Found 6+ unique KMAs (meets requirement)');
      } else {
        console.log('⚠️ WARNING: Only found', uniqueKmas.size, 'unique KMAs (minimum 6 required)');
      }
      
      // Log the first few pairs for inspection
      console.log('\n📋 Sample pairs:');
      result.pairs.slice(0, 3).forEach((pair, idx) => {
        console.log(`  ${idx + 1}. ${pair.origin_city}, ${pair.origin_state} → ${pair.destination_city}, ${pair.destination_state} (KMA: ${pair.kma_code})`);
      });
      
      console.log('\n✅ API ADAPTER INTEGRATION SUCCESSFUL');
    } else {
      console.error('❌ ERROR: API returned no pairs');
      console.error('Response:', result);
    }
  } catch (error) {
    console.error('❌ ERROR: API test failed');
    console.error(error);
    
    // Check for specific errors
    if (error.message && error.message.includes('400')) {
      console.error('❌ 400 BAD REQUEST - Parameter formatting issue still exists!');
    } else if (error.message && error.message.includes('401')) {
      console.error('❌ 401 UNAUTHORIZED - Authentication issue!');
    }
  }
  
  console.log('='.repeat(50));
}

// Run the test
runValidationTest();