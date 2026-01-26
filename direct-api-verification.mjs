#!/usr/bin/env node
/**
 * Production Direct Test Script
 * Comprehensive test for RapidRoutes Intelligence API
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

// Configuration
const SUPABASE_URL = "https://gwuhjxomavulwduhvgvi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Mzk2MjksImV4cCI6MjA2NzUxNTYyOX0.fM8EeVag9MREyjBVv2asGpIgI_S7k_889kDDbE-8oUs";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ";
const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';

// Test lanes covering diverse geographic areas
const TEST_LANES = [
  {
    name: "Chicago to Atlanta (Flatbed)",
    data: {
      originCity: "Chicago",
      originState: "IL",
      originZip: "60601",
      destCity: "Atlanta",
      destState: "GA",
      destZip: "30303",
      equipmentCode: "FD"
    }
  },
  {
    name: "Los Angeles to Dallas (Van)",
    data: {
      originCity: "Los Angeles",
      originState: "CA",
      originZip: "90001",
      destCity: "Dallas",
      destState: "TX",
      destZip: "75201",
      equipmentCode: "V"
    }
  },
  {
    name: "New York to Miami (Reefer)",
    data: {
      originCity: "New York",
      originState: "NY",
      originZip: "10001",
      destCity: "Miami",
      destState: "FL",
      destZip: "33101",
      equipmentCode: "R"
    }
  }
];

// Helper function to count unique KMAs in response
function countUniqueKmas(pairs) {
  if (!pairs || !Array.isArray(pairs)) return { uniqueCount: 0, kmas: [] };
  
  const allKmas = new Set();
  
  pairs.forEach(pair => {
    // Handle different formats of KMA codes in response
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

// Create test user for authentication
async function authenticate() {
  console.log('\n🔑 Authenticating with Supabase...');
  
  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Generate unique test credentials
    const timestamp = Date.now();
    const testEmail = `test-user-${timestamp}@rapidroutes-verify.com`;
    const testPassword = `TestPass${timestamp}!`;
    
    console.log(`📧 Creating test user: ${testEmail}`);
    
    // Sign up new user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signUpError) {
      console.error('❌ User signup failed:', signUpError.message);
      
      // Attempt to sign in with fixed test account as fallback
      console.log('🔄 Attempting to sign in with fallback test account...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test@rapidroutes.com',
        password: 'TestRapidRoutes2025!'
      });
      
      if (signInError) {
        console.log('❌ Fallback authentication failed:', signInError.message);
        console.log('🔑 Attempting service role authentication...');
        // Return service role key as a last resort
        return SUPABASE_SERVICE_ROLE_KEY;
      }
      
      console.log('✅ Fallback authentication successful');
      return signInData.session.access_token;
    }
    
    // If sign up successful, sign in to get session
    console.log('✅ User created successfully, signing in...');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (error) {
      console.error('❌ Sign in failed:', error.message);
      return null;
    }
    
    console.log('✅ Authentication successful');
    return data.session.access_token;
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return null;
  }
}

// Test a single lane
async function testLane(token, lane) {
  console.log(`\n🚚 Testing lane: ${lane.name}`);
  
  try {
    console.log('📡 Sending request to API...');
    const startTime = Date.now();
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(lane.data)
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`⏱️ Response received in ${responseTime}ms with status ${response.status}`);
    
    // Handle non-successful responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      return {
        name: lane.name,
        success: false,
        status: response.status,
        error: errorText,
        responseTime
      };
    }
    
    // Parse the response
    const data = await response.json();
    
    // Verify pairs array exists
    if (!data.pairs || !Array.isArray(data.pairs)) {
      console.error('❌ Response missing pairs array');
      return {
        name: lane.name,
        success: false,
        error: 'Invalid response format: missing pairs array',
        responseTime
      };
    }
    
    // Count KMAs and analyze response
    const kmaInfo = countUniqueKmas(data.pairs);
    const pairsCount = data.pairs.length;
    
    console.log(`✅ Success! Received ${pairsCount} pairs with ${kmaInfo.uniqueCount} unique KMAs`);
    console.log(`KMA codes: ${kmaInfo.kmas.join(', ')}`);
    
    // Check KMA diversity requirement
    const meetsKmaRequirement = kmaInfo.uniqueCount >= 6;
    if (meetsKmaRequirement) {
      console.log('✅ KMA diversity requirement met');
    } else {
      console.log(`⚠️ KMA diversity below requirement: ${kmaInfo.uniqueCount}/6`);
    }
    
    return {
      name: lane.name,
      success: true,
      status: response.status,
      responseTime,
      pairsCount,
      kmaCount: kmaInfo.uniqueCount,
      kmas: kmaInfo.kmas,
      meetsRequirement: meetsKmaRequirement
    };
  } catch (error) {
    console.error(`❌ Error testing lane: ${error.message}`);
    return {
      name: lane.name,
      success: false,
      error: error.message
    };
  }
}

// Main function
async function main() {
  console.log('\n🔍 RAPIDROUTES INTELLIGENCE API VERIFICATION');
  console.log('==========================================');
  console.log(`📆 Date: ${new Date().toISOString()}`);
  console.log(`🌐 Testing API: ${API_URL}`);
  
  // Step 1: Authenticate
  const token = await authenticate();
  if (!token) {
    console.error('\n❌ Authentication failed, cannot proceed with tests');
    process.exit(1);
  }
  
  // Step 2: Test each lane
  const results = [];
  let allSuccessful = true;
  let allMeetRequirement = true;
  
  for (const lane of TEST_LANES) {
    const result = await testLane(token, lane);
    results.push(result);
    
    if (!result.success) {
      allSuccessful = false;
    } else if (!result.meetsRequirement) {
      allMeetRequirement = false;
    }
  }
  
  // Step 3: Generate summary
  console.log('\n📊 VERIFICATION SUMMARY:');
  console.log('---------------------');
  
  results.forEach(result => {
    const status = result.success 
      ? (result.meetsRequirement ? '✅ PASS' : '⚠️ WARN') 
      : '❌ FAIL';
    console.log(`${status} ${result.name}: ${result.success 
      ? `${result.kmaCount} KMAs, ${result.pairsCount} pairs, ${result.responseTime}ms` 
      : result.error}`);
  });
  
  // Calculate stats
  const successCount = results.filter(r => r.success).length;
  const kmaRequirementMet = results.filter(r => r.success && r.meetsRequirement).length;
  const avgResponseTime = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.responseTime, 0) / successCount || 0;
  
  console.log('\n📈 STATISTICS:');
  console.log(`- API calls successful: ${successCount}/${TEST_LANES.length} (${Math.round(successCount/TEST_LANES.length*100)}%)`);
  console.log(`- KMA requirement met: ${kmaRequirementMet}/${TEST_LANES.length} (${Math.round(kmaRequirementMet/TEST_LANES.length*100)}%)`);
  console.log(`- Average response time: ${Math.round(avgResponseTime)}ms`);
  
  // Final verdict
  if (allSuccessful && allMeetRequirement) {
    console.log('\n🎉 OVERALL RESULT: ✅ SUCCESS');
    console.log('All tests passed successfully!');
  } else if (allSuccessful) {
    console.log('\n⚠️ OVERALL RESULT: ⚠️ PARTIAL SUCCESS');
    console.log('API is functional but some lanes have insufficient KMA diversity');
  } else {
    console.log('\n❌ OVERALL RESULT: ❌ FAILURE');
    console.log('Some API calls failed completely');
  }
  
  // Return comprehensive results
  return {
    timestamp: new Date().toISOString(),
    apiUrl: API_URL,
    summary: {
      totalTested: TEST_LANES.length,
      successCount,
      kmaRequirementMet,
      allSuccessful,
      allMeetRequirement,
      averageResponseTime: Math.round(avgResponseTime)
    },
    results
  };
}

// Run the verification and generate report
main().then(async (results) => {
  // Save results to file
  await fs.writeFile(
    'verification-results.json', 
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n📄 Detailed results saved to verification-results.json');
  
  // Exit with appropriate code
  process.exit(results.summary.allSuccessful && results.summary.allMeetRequirement ? 0 : 1);
}).catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});