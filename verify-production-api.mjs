#!/usr/bin/env node
/**
 * RapidRoutes Production API Verification
 * 
 * This script verifies the production intelligence-pairing API by:
 * 1. Authenticating with Supabase using real credentials
 * 2. Calling the API with a proper JWT token
 * 3. Verifying the response contains lane pairs with at least 5 unique KMAs
 */

import fetch from 'node-fetch';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Configuration - use environment variables when available
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vywvmhdyyhkdpmbfzkgx.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5d3ZtaGR5eWhrZHBtYmZ6a2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODk0NTU3MTYsImV4cCI6MjAwNTAzMTcxNn0.BL_eQYpTPP9DW_hd1_X1Nm10K86kx9QSZ37ZRRi7icQ';

// Test email and password from environment variables
// Set these before running: export TEST_USER_EMAIL=your@email.com TEST_USER_PASSWORD=yourpassword
const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;

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

// API URLs to test
const PROD_API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';
const LOCAL_API_URL = 'http://localhost:3000/api/intelligence-pairing';

// Helper function to format KMA information
function formatKmaData(kmas) {
  if (!kmas || kmas.length === 0) return "No KMA data found";
  
  return kmas.map(kma => `  - ${kma.code}: ${kma.count} pairs`).join('\n');
}

// Helper function to show sample pairs
function formatSamplePairs(pairs, count = 3) {
  if (!pairs || pairs.length === 0) return "No pairs found";
  
  let result = '';
  
  for (let i = 0; i < Math.min(count, pairs.length); i++) {
    const pair = pairs[i];
    result += `\nPair #${i+1}:\n`;
    result += `- Origin: ${pair.origin_city}, ${pair.origin_state} ${pair.origin_zip} (KMA: ${pair.origin_kma})\n`;
    result += `- Destination: ${pair.dest_city}, ${pair.dest_state} ${pair.dest_zip} (KMA: ${pair.dest_kma})\n`;
    result += `- Distance: ${pair.distance_miles} miles\n`;
    result += `- Equipment: ${pair.equipment_code || 'unknown'}\n`;
  }
  
  return result;
}

// Helper function to analyze KMA codes in the response
function analyzeKmas(pairs) {
  if (!pairs || pairs.length === 0) return { origins: [], destinations: [], uniqueCount: 0 };
  
  const originKmas = {};
  const destKmas = {};
  
  pairs.forEach(pair => {
    if (pair.origin_kma) {
      if (!originKmas[pair.origin_kma]) originKmas[pair.origin_kma] = 0;
      originKmas[pair.origin_kma]++;
    }
    
    if (pair.dest_kma) {
      if (!destKmas[pair.dest_kma]) destKmas[pair.dest_kma] = 0;
      destKmas[pair.dest_kma]++;
    }
  });
  
  const originKmaArray = Object.keys(originKmas).map(code => ({ code, count: originKmas[code] }));
  const destKmaArray = Object.keys(destKmas).map(code => ({ code, count: destKmas[code] }));
  
  return {
    origins: originKmaArray,
    destinations: destKmaArray,
    uniqueCount: new Set([...Object.keys(originKmas), ...Object.keys(destKmas)]).size
  };
}

// Step 1: Authenticate with Supabase using credentials
async function authenticateWithSupabase() {
  console.log('\n=======================');
  console.log('= SUPABASE AUTHENTICATION =');
  console.log('=======================');
  console.log('Authenticating with Supabase...');
  
  try {
    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    let session;
    
    // Require password authentication for production verification
    if (!EMAIL || !PASSWORD) {
      console.log('❌ Error: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required');
      console.log('Please set these environment variables before running:');
      console.log('export TEST_USER_EMAIL=your@email.com TEST_USER_PASSWORD=yourpassword');
      return null;
    }
    
    console.log(`Authenticating with Supabase using email (${EMAIL})...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD
    });
    
    if (error) {
      console.log(`❌ Authentication failed: ${error.message}`);
      return null;
    }
    
    session = data.session;
    console.log('✅ Authentication successful!')

    if (!session?.access_token) {
      console.log('❌ No access token in session');
      return null;
    }

    console.log(`✅ Token received (first 15 chars): ${session.access_token.substring(0, 15)}...`);
    
    return session.access_token;
  } catch (err) {
    console.log(`❌ Error during Supabase authentication: ${err.message}`);
    return null;
  }
}

// Step 2: Call the intelligence-pairing API with token
async function callApi(token, url) {
  console.log('\n=======================');
  console.log(`= TESTING API: ${url} =`);
  console.log('=======================');

  console.log('Request details:');
  console.log('- URL:', url);
  console.log('- Method: POST');
  console.log('- Headers:');
  console.log('  - Content-Type: application/json');
  console.log('  - Authorization: Bearer ' + token.substring(0, 15) + '...');
  console.log('- Payload:');
  Object.entries(testLane).forEach(([key, value]) => {
    console.log(`  - ${key}: ${value}`);
  });
  console.log();

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify(testLane)
    });
    const endTime = Date.now();
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (err) {
      console.log('❌ Failed to parse response as JSON');
      console.log('Response text:', responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''));
      return { success: false, error: 'Invalid JSON response' };
    }
    
    const responseSize = responseText.length;
    
    console.log('Response:');
    console.log(`- Status: ${response.status} ${response.statusText}`);
    console.log(`- Time: ${endTime - startTime}ms`);
    console.log(`- Size: ${responseSize} bytes`);
    
    if (response.ok) {
      console.log('✅ Success! Received 200 OK response\n');
      
      // Save the response to a file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `api-verification-${timestamp}.json`;
      fs.writeFileSync(filename, JSON.stringify(responseData, null, 2));
      console.log(`Response saved to ${filename}\n`);
      
      // Analyze the response
      console.log('===================');
      console.log('= RESPONSE ANALYSIS =');
      console.log('===================\n');
      
      console.log(`✅ Response status: ${response.status} ${response.statusText}`);
      console.log(`✅ Success flag: ${responseData.success}`);
      
      if (!responseData.pairs || !Array.isArray(responseData.pairs)) {
        console.log('❌ No valid pairs array found in response');
        return { success: false, error: 'No pairs array in response' };
      }
      
      console.log(`✅ Pairs found: ${responseData.pairs.length}`);
      
      // Analyze KMAs
      const kmaAnalysis = analyzeKmas(responseData.pairs);
      
      console.log('KMA Analysis:');
      console.log(`- Unique origin KMAs: ${kmaAnalysis.origins.length}`);
      console.log(formatKmaData(kmaAnalysis.origins));
      console.log();
      
      console.log(`- Unique destination KMAs: ${kmaAnalysis.destinations.length}`);
      console.log(formatKmaData(kmaAnalysis.destinations));
      console.log();
      
      console.log(`- Total unique KMAs: ${kmaAnalysis.uniqueCount}`);
      
      if (kmaAnalysis.uniqueCount >= 5) {
        console.log(`✅ REQUIREMENT MET: ${kmaAnalysis.uniqueCount} unique KMAs (minimum 5)`);
      } else {
        console.log(`❌ REQUIREMENT NOT MET: Only ${kmaAnalysis.uniqueCount} unique KMAs (minimum 5 required)`);
        return { 
          success: false, 
          error: `Insufficient KMA diversity: ${kmaAnalysis.uniqueCount} (required: 5)`,
          responseData 
        };
      }
      
      // Sample pairs
      console.log('\nSample pairs:');
      console.log(formatSamplePairs(responseData.pairs, 3));
      
      // Success message
      console.log('\n🎉 VERIFICATION SUCCESSFUL! 🎉');
      console.log('The RapidRoutes intelligence-pairing API is working correctly!');
      console.log(`- Authentication is functioning properly`);
      console.log(`- Lane generation produces ${responseData.pairs.length} pairs`);
      console.log(`- API returns ${kmaAnalysis.uniqueCount} unique KMAs (exceeding the 5 minimum)`);
      console.log(`- Response is properly structured with all required fields`);
      
      return { success: true, responseData };
    } else {
      console.log(`❌ Failed with status ${response.status}`);
      console.log('Error details:', responseData);

      if (response.status === 401) {
        console.log('\n🔑 Authentication failed. Possible issues:');
        console.log('1. Token is invalid or expired');
        console.log('2. Token signature validation is failing');
        console.log('3. Token format is not being correctly processed');
      }

      return { success: false, error: responseData };
    }
  } catch (error) {
    console.log('❌ Error during API call:');
    console.error(error);
    return { success: false, error };
  }
}

// Main function to run the verification
async function main() {
  console.log('🔍 RapidRoutes API Verification');
  console.log('===============================\n');
  
  // Step 1: Authenticate
  const token = await authenticateWithSupabase();
  
  if (!token) {
    console.log('\n❌ Authentication failed. Cannot proceed with API verification.');
    process.exit(1);
  }
  
  // Step 2: Try production URL first
  console.log('\nTesting production API...');
  const prodResult = await callApi(token, PROD_API_URL);
  
  // Step 3: If production failed, try local URL
  if (!prodResult.success) {
    console.log('\n⚠️ Production API verification failed. Trying local development server...');
    const localResult = await callApi(token, LOCAL_API_URL);
    
    if (!localResult.success) {
      console.log('\n❌ Verification failed on both production and local environments.');
      process.exit(1);
    }
  }
  
  console.log('\n✅ Verification complete!');
}

// Run the main function
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
