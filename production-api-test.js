#!/usr/bin/env node
/**
 * Direct Production API Test
 * Simple script to test the intelligence-pairing API directly
 */

import fetch from 'node-fetch';

// Supabase credentials 
const SUPABASE_URL = "https://vywvmhdyyhkdpmbfzkgx.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5d3ZtaGR5eWhrZHBtYmZ6a2d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NDI4MzQ2NiwiZXhwIjoxOTU5ODU5NDY2fQ.mWv-ZkKdY06stDFGNyuFYCxzQwkXQj1hp94sNb8VGas";

// API URLs
const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';

// Test lane data
const testLane = {
  originCity: 'Chicago',
  originState: 'IL',
  originZip: '60601',
  destCity: 'Atlanta', 
  destState: 'GA',
  destZip: '30303',
  equipmentCode: 'FD'
};

// Count unique KMAs in the response
function countUniqueKmas(pairs) {
  if (!pairs || !Array.isArray(pairs)) return { uniqueCount: 0, kmas: [] };
  
  const allKmas = new Set();
  
  pairs.forEach(pair => {
    const originKma = pair.origin?.kma_code || pair.originKma;
    const destKma = pair.destination?.kma_code || pair.destKma;
    
    if (originKma) allKmas.add(originKma);
    if (destKma) allKmas.add(destKma);
  });
  
  return {
    uniqueCount: allKmas.size,
    kmas: Array.from(allKmas)
  };
}

// Make timestamp for logs
function getTimestamp() {
  return new Date().toISOString();
}

// Main function
async function main() {
  console.log(`\n🚚 RAPID ROUTES DIRECT API TEST - ${getTimestamp()}`);
  console.log(`🌐 Testing API: ${API_URL}`);

  // Test with service key directly in authorization header
  try {
    console.log('\n🔐 Using service key for authentication...');
    
    const startTime = Date.now();
    
    console.log(`🌍 Testing lane: Chicago, IL → Atlanta, GA (FD)`);
    console.log('📡 Sending request...');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify(testLane)
    });
    
    const responseTime = Date.now() - startTime;
    
    // Check response status
    console.log(`⏱️ Response received in ${responseTime}ms with status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`❌ API ERROR: ${response.status} - ${errorText}`);
      return { 
        success: false, 
        status: response.status, 
        error: errorText,
        responseTime
      };
    }
    
    // Parse response
    const data = await response.json();
    
    // Validate the response has a pairs array
    if (!data.pairs || !Array.isArray(data.pairs)) {
      console.log('❌ Invalid response format: missing pairs array');
      return { 
        success: false, 
        error: 'Invalid response format: missing pairs array',
        responseTime 
      };
    }
    
    // Count and validate KMAs
    const kmaInfo = countUniqueKmas(data.pairs);
    const pairsCount = data.pairs.length;
    
    console.log(`\n✅ SUCCESS! Response contains ${pairsCount} pairs`);
    console.log(`🔍 Found ${kmaInfo.uniqueCount} unique KMAs: ${kmaInfo.kmas.join(', ')}`);
    
    if (kmaInfo.uniqueCount >= 6) {
      console.log('✅ KMA DIVERSITY REQUIREMENT MET!');
    } else {
      console.log(`⚠️ KMA diversity below requirement: ${kmaInfo.uniqueCount}/6 minimum`);
    }
    
    // Results summary
    const results = {
      success: true,
      status: response.status,
      responseTime,
      pairsCount,
      uniqueKmasCount: kmaInfo.uniqueCount,
      uniqueKmas: kmaInfo.kmas,
      kmaRequirementMet: kmaInfo.uniqueCount >= 6
    };
    
    console.log('\n📊 TEST RESULTS:');
    console.log(`- Authentication: ✅ Successful (${response.status})`);
    console.log(`- Response time: ${responseTime}ms`);
    console.log(`- Pairs generated: ${pairsCount}`);
    console.log(`- Unique KMAs: ${kmaInfo.uniqueCount}`);
    console.log(`- KMA requirement: ${results.kmaRequirementMet ? '✅ MET' : '❌ NOT MET'}`);
    
    if (results.kmaRequirementMet) {
      console.log('\n🎉 OVERALL VERIFICATION: ✅ SUCCESS');
    } else {
      console.log('\n⚠️ OVERALL VERIFICATION: ❌ FAILURE - KMA requirement not met');
    }
    
    return results;
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run the test
main().then(results => {
  if (results.success && results.kmaRequirementMet) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});