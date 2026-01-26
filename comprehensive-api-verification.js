// comprehensive-api-verification.js
// Complete verification of intelligence-pairing endpoint
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import 'dotenv/config';

// Load environment variables
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test session token (if you have one)
const SESSION_TOKEN = process.env.TEST_SESSION_TOKEN || '';

// Test configuration
const TEST_TIMEOUT = 10000; // 10 seconds
const VERIFICATION_LOG = 'api-verification-results.json';

// Initialize Supabase client
let supabase = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Test lane data
const testLanes = [
  {
    origin_city: 'Raleigh',
    origin_state: 'NC',
    origin_zip: '27601',
    dest_city: 'Charlotte',
    dest_state: 'NC',
    dest_zip: '28202',
    equipment_code: 'V',
    weight_lbs: 40000,
  },
  {
    origin_city: 'Chicago',
    origin_state: 'IL',
    origin_zip: '60601',
    dest_city: 'Indianapolis',
    dest_state: 'IN',
    dest_zip: '46201',
    equipment_code: 'V',
    weight_lbs: 35000,
  },
  {
    origin_city: 'New York',
    origin_state: 'NY',
    origin_zip: '10001',
    dest_city: 'Boston',
    dest_state: 'MA',
    dest_zip: '02101',
    equipment_code: 'FD',
    weight_lbs: 42000,
  }
];

/**
 * Get the authentication token
 */
async function getAuthToken() {
  if (SESSION_TOKEN) {
    console.log('Using provided session token');
    return SESSION_TOKEN;
  }
  
  if (!supabase) {
    throw new Error('Supabase client not initialized, cannot authenticate');
  }
  
  console.log('🔑 Attempting to sign in with test credentials...');
  
  // Try to use test mode if environment allows
  try {
    const testAuth = process.env.TEST_AUTH || 'test@example.com:password123';
    const [email, password] = testAuth.split(':');
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    console.log('✅ Authentication successful');
    return data.session.access_token;
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    throw new Error('Cannot authenticate: ' + error.message);
  }
}

/**
 * Test the API with different lanes
 */
async function testIntelligencePairing(authToken) {
  console.log('🧪 Testing intelligence-pairing endpoint...');
  
  const results = [];
  let allSuccess = true;
  
  for (const lane of testLanes) {
    console.log(`Testing lane: ${lane.origin_city}, ${lane.origin_state} to ${lane.dest_city}, ${lane.dest_state}`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/intelligence-pairing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ lane }),
        timeout: TEST_TIMEOUT
      });
      
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { text: responseText };
      }
      
      const result = {
        lane,
        status: response.status,
        statusText: response.statusText,
        success: response.status >= 200 && response.status < 300,
        data: responseData,
        timestamp: new Date().toISOString()
      };
      
      if (!result.success) {
        allSuccess = false;
      }
      
      results.push(result);
      
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Success: ${result.success ? '✅' : '❌'}`);
      
      if (responseData && responseData.cityPairs && responseData.cityPairs.length > 0) {
        console.log(`  Found ${responseData.cityPairs.length} city pairs`);
      } else {
        console.log('  No city pairs found or invalid response');
      }
      
      console.log('');
      
    } catch (error) {
      console.error(`❌ Error testing lane: ${error.message}`);
      allSuccess = false;
      
      results.push({
        lane,
        status: 0,
        statusText: 'Request Failed',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // Save results to file
  await fs.writeFile(VERIFICATION_LOG, JSON.stringify({
    timestamp: new Date().toISOString(),
    allSuccess,
    results
  }, null, 2));
  
  console.log(`💾 Results saved to ${VERIFICATION_LOG}`);
  
  return {
    allSuccess,
    results
  };
}

/**
 * Test the database RPC function directly
 */
async function testRpcFunction(authToken) {
  if (!supabase) {
    console.log('⚠️ Skipping RPC function test - Supabase client not initialized');
    return null;
  }
  
  console.log('🔍 Testing RPC function directly...');
  
  try {
    // Update Supabase client with auth token
    supabase.auth.setSession({
      access_token: authToken,
      refresh_token: '',
    });
    
    // Test with Raleigh coordinates
    const { data, error } = await supabase.rpc('find_cities_within_radius', {
      lat_param: 35.7796,
      lng_param: -78.6382,
      radius_meters: 80467 // ~50 miles
    });
    
    if (error) {
      console.error('❌ RPC function test failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
    
    console.log(`✅ RPC function returned ${data?.length || 0} cities`);
    
    if (data && data.length > 0) {
      console.log('Sample cities:');
      data.slice(0, 3).forEach(city => {
        console.log(`  - ${city.city}, ${city.state_or_province} (${city.kma_code})`);
      });
    }
    
    return {
      success: true,
      citiesCount: data?.length || 0,
      sampleCities: data?.slice(0, 5) || []
    };
    
  } catch (error) {
    console.error('❌ Error testing RPC function:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main verification process
 */
async function verifyApi() {
  console.log('🔎 Starting API verification process...');
  console.log(`🌐 API Base URL: ${BASE_URL}`);
  
  try {
    // Get auth token
    const authToken = await getAuthToken();
    
    if (!authToken) {
      console.error('❌ Could not obtain authentication token');
      process.exit(1);
    }
    
    // Test RPC function directly
    const rpcResult = await testRpcFunction(authToken);
    
    // Test the API
    const apiResult = await testIntelligencePairing(authToken);
    
    // Final summary
    console.log('');
    console.log('📋 VERIFICATION SUMMARY');
    console.log('=====================');
    
    if (rpcResult) {
      console.log(`RPC Function: ${rpcResult.success ? '✅ WORKING' : '❌ FAILED'}`);
      if (rpcResult.success) {
        console.log(`  Found ${rpcResult.citiesCount} cities with RPC function`);
      }
    }
    
    console.log(`API Endpoint: ${apiResult.allSuccess ? '✅ WORKING' : '❌ ISSUES DETECTED'}`);
    console.log(`  Tested ${apiResult.results.length} lanes`);
    console.log(`  Success rate: ${apiResult.results.filter(r => r.success).length}/${apiResult.results.length}`);
    
    const hasActualData = apiResult.results.some(r => 
      r.data && r.data.cityPairs && r.data.cityPairs.length > 0
    );
    
    console.log(`  Response data: ${hasActualData ? '✅ City pairs found' : '⚠️ No city pairs in response'}`);
    
    console.log('');
    console.log(apiResult.allSuccess && hasActualData ? 
      '🎉 VERIFICATION SUCCESSFUL - API IS WORKING CORRECTLY!' : 
      '⚠️ VERIFICATION INCOMPLETE - Issues detected, check the logs');
    
  } catch (error) {
    console.error('💥 Verification process failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyApi();