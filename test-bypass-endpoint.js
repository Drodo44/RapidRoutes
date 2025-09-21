#!/usr/bin/env node
/**
 * RapidRoutes Bypass Auth Test
 * 
 * This script tests the bypass-auth-for-testing endpoint to verify that
 * the intelligence pairing functionality is working correctly without
 * authentication for test purposes only.
 */

import fetch from 'node-fetch';

// Get API URL from command line or use default
const apiUrl = process.argv[2] || 'https://rapid-routes.vercel.app';

// Test data
const testData = {
  originCity: 'Chicago',
  originState: 'IL',
  originZip: '60601',
  destCity: 'Atlanta',
  destState: 'GA',
  destZip: '30303',
  equipmentCode: 'FD'
};

async function testBypassEndpoint() {
  console.log('🔍 RapidRoutes Bypass Auth Test');
  console.log('==============================');
  console.log(`🌐 Testing API: ${apiUrl}/api/bypass-auth-for-testing`);
  console.log('📦 Test data:', JSON.stringify(testData));
  
  try {
    console.log('\n📤 Sending request...');
    const response = await fetch(`${apiUrl}/api/bypass-auth-for-testing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    console.log(`📥 Response status: ${response.status}`);
    
    const text = await response.text();
    
    try {
      // Try parsing as JSON
      const result = JSON.parse(text);
      console.log(`📥 Response is valid JSON`);
      
      if (result.success && Array.isArray(result.pairs)) {
        console.log(`\n✅ SUCCESS! API returned ${result.pairs.length} pairs`);
        
        // Count unique KMA codes
        const uniqueKmas = new Set();
        result.pairs.forEach(pair => {
          if (pair.origin_kma) uniqueKmas.add(pair.origin_kma);
          if (pair.dest_kma) uniqueKmas.add(pair.dest_kma);
        });
        
        console.log(`✅ Found ${uniqueKmas.size} unique KMA codes`);
        
        // Show sample pairs
        console.log('\n📋 Sample pairs (first 3):');
        result.pairs.slice(0, 3).forEach((pair, index) => {
          console.log(`\nPair ${index + 1}:`);
          console.log(JSON.stringify(pair, null, 2));
        });
        
        return true;
      } else {
        console.error(`❌ API returned error:`);
        console.error(JSON.stringify(result, null, 2));
        return false;
      }
    } catch (e) {
      console.error(`❌ Response is not valid JSON:`, e.message);
      console.error(`Response (first 500 chars): ${text.substring(0, 500)}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    return false;
  }
}

testBypassEndpoint().then(success => {
  process.exit(success ? 0 : 1);
});