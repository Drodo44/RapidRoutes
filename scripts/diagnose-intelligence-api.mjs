#!/usr/bin/env node
/**
 * RapidRoutes Intelligence API Diagnostics
 * 
 * End-to-end verification of the intelligence-pairing API
 * including authentication, API call, and response validation
 */

import fetch from 'node-fetch';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Step 1: Verify environment variables
console.log('🔍 Verifying environment variables...');
const requiredEnvVars = ['TEST_USER_EMAIL', 'TEST_USER_PASSWORD', 'API_URL'];
const missingEnvVars = [];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingEnvVars.push(envVar);
  }
}

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please set these environment variables and try again.');
  process.exit(1);
}

console.log('✅ All required environment variables are present');

// Supabase configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lbcydtbyqxorycrhehao.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiY3lkdGJ5cXhvcnljcmhlaGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc0MzA2NjksImV4cCI6MjAzMzAwNjY2OX0.JIliP9R_YO2nM9UFkXzLrEmZvVsN5dfukwb0axP4sWQ';
const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;
const API_URL = process.env.API_URL;

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

// Diagnostic results
const diagnosticResult = {
  auth: {
    status: 'pending',
    method: null,
    token_ok: false
  },
  api: {
    url: API_URL,
    status: null,
    time_ms: null
  },
  pairs_count: 0,
  unique_kmas: 0,
  kma_details: [],
  sample_pairs: [],
  fixes_applied: [],
  suggested_next_steps: [],
  raw_response: null
};

/**
 * Count unique KMAs in response pairs
 */
function analyzeKmas(pairs) {
  if (!pairs || !Array.isArray(pairs) || pairs.length === 0) {
    return { uniqueCount: 0, kmaDetails: [] };
  }
  
  const kmaStats = {};
  
  pairs.forEach(pair => {
    const originKma = pair.origin_kma || pair.originKma;
    const destKma = pair.dest_kma || pair.destKma;
    
    if (!kmaStats[originKma]) kmaStats[originKma] = { code: originKma, origin_count: 0, dest_count: 0 };
    if (!kmaStats[destKma]) kmaStats[destKma] = { code: destKma, origin_count: 0, dest_count: 0 };
    
    kmaStats[originKma].origin_count++;
    kmaStats[destKma].dest_count++;
  });
  
  return {
    uniqueCount: Object.keys(kmaStats).length,
    kmaDetails: Object.values(kmaStats)
  };
}

/**
 * Step 2: Authenticate with Supabase
 */
async function authenticate() {
  console.log('\n🔐 Authenticating with Supabase...');
  console.log(`- Email: ${EMAIL.substring(0, 3)}***${EMAIL.substring(EMAIL.indexOf('@'))}`);
  console.log(`- Supabase URL: ${SUPABASE_URL}`);
  
  try {
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    let authMethod = 'password';
    const startTime = Date.now();
    let authResult;
    
    // Try password authentication first
    try {
      authResult = await supabase.auth.signInWithPassword({
        email: EMAIL,
        password: PASSWORD
      });
      
      if (authResult.error) {
        console.log(`❌ Password authentication failed: ${authResult.error.message}`);
        
        // Try anonymous auth as fallback (for debugging only)
        console.log('🔄 Attempting anonymous authentication as fallback...');
        authMethod = 'anon';
        authResult = await supabase.auth.signInAnonymously();
        
        if (authResult.error) {
          throw new Error(`Anonymous authentication failed: ${authResult.error.message}`);
        }
      }
    } catch (authError) {
      throw new Error(`Authentication error: ${authError.message}`);
    }
    
    const authTime = Date.now() - startTime;
    
    // Extract session data
    const session = authResult.data?.session;
    if (!session?.access_token) {
      throw new Error('No access token in session');
    }
    
    console.log(`✅ Authentication successful using ${authMethod} method (${authTime}ms)`);
    console.log(`✅ Token received (first 15 chars): ${session.access_token.substring(0, 15)}...`);
    
    // Update diagnostic result
    diagnosticResult.auth.status = 'ok';
    diagnosticResult.auth.method = authMethod;
    diagnosticResult.auth.token_ok = true;
    
    return session.access_token;
  } catch (err) {
    console.error(`❌ Authentication failed: ${err.message}`);
    
    // Update diagnostic result
    diagnosticResult.auth.status = 'fail';
    diagnosticResult.auth.error = err.message;
    diagnosticResult.suggested_next_steps.push('Check Supabase authentication settings and credentials');
    
    throw err;
  }
}

/**
 * Step 3: Call the intelligence-pairing API
 */
async function callApi(token) {
  console.log(`\n🌐 Calling API: ${API_URL}`);
  console.log(`- Method: POST`);
  console.log(`- Origin: ${testLane.originCity}, ${testLane.originState}`);
  console.log(`- Destination: ${testLane.destCity}, ${testLane.destState}`);
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testLane)
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Get response text first to avoid parsing errors
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`Failed to parse response as JSON: ${responseText.substring(0, 500)}...`);
    }
    
    console.log(`✅ Received response in ${responseTime}ms`);
    console.log(`- Status: ${response.status} ${response.statusText}`);
    
    // Update diagnostic result
    diagnosticResult.api.status = response.status;
    diagnosticResult.api.time_ms = responseTime;
    diagnosticResult.raw_response = responseText.length > 10000 ? 
      `${responseText.substring(0, 10000)}... [truncated, ${responseText.length} chars total]` : 
      responseData;
    
    return { 
      status: response.status,
      data: responseData,
      time: responseTime
    };
  } catch (error) {
    console.error(`❌ API call failed: ${error.message}`);
    
    // Update diagnostic result
    diagnosticResult.api.status = 'error';
    diagnosticResult.api.error = error.message;
    diagnosticResult.suggested_next_steps.push('Check API availability and network connectivity');
    
    throw error;
  }
}

/**
 * Step 4: Validate the API response
 */
function validateResponse(responseData) {
  console.log('\n🔍 Validating API response...');
  
  if (!responseData.success) {
    throw new Error(`API returned error: ${JSON.stringify(responseData.error || responseData)}`);
  }
  
  if (!responseData.pairs || !Array.isArray(responseData.pairs)) {
    throw new Error('Response does not contain a valid pairs array');
  }
  
  const pairs = responseData.pairs;
  console.log(`✅ Found ${pairs.length} pairs in response`);
  
  // Analyze KMAs
  const kmaAnalysis = analyzeKmas(pairs);
  console.log(`✅ Found ${kmaAnalysis.uniqueCount} unique KMAs`);
  
  if (kmaAnalysis.uniqueCount < 5) {
    console.warn(`⚠️ WARNING: Only ${kmaAnalysis.uniqueCount} unique KMAs found (minimum 5 required)`);
    diagnosticResult.suggested_next_steps.push(
      'Investigate why fewer than 5 unique KMAs were returned',
      'Check geographicCrawl.js for early exits or radius limitations'
    );
  } else {
    console.log(`✅ KMA requirement met: ${kmaAnalysis.uniqueCount} unique KMAs (minimum 5)`);
  }
  
  // Update diagnostic result
  diagnosticResult.pairs_count = pairs.length;
  diagnosticResult.unique_kmas = kmaAnalysis.uniqueCount;
  diagnosticResult.kma_details = kmaAnalysis.kmaDetails;
  diagnosticResult.sample_pairs = pairs.slice(0, 10);
  
  return {
    valid: kmaAnalysis.uniqueCount >= 5,
    pairs,
    kmaAnalysis
  };
}

/**
 * Main function to run all verification steps
 */
async function main() {
  console.log('🚀 Starting RapidRoutes Intelligence API Verification\n');
  
  try {
    // Step 2: Authenticate
    const token = await authenticate();
    
    // Step 3: Call API
    const apiResponse = await callApi(token);
    
    // Step 4: Validate Response
    if (apiResponse.status === 200) {
      validateResponse(apiResponse.data);
    } else if (apiResponse.status === 401) {
      console.error('❌ API returned 401 Unauthorized. Token validation failed.');
      diagnosticResult.suggested_next_steps.push(
        'Check token extraction in intelligence-pairing.js',
        'Verify that the Bearer prefix is properly handled',
        'Ensure token validation logic uses the correct Supabase client'
      );
      diagnosticResult.auth.token_ok = false;
    } else {
      console.error(`❌ API returned unexpected status: ${apiResponse.status}`);
      diagnosticResult.suggested_next_steps.push('Check server logs for errors');
    }
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`);
  } finally {
    // Save diagnostic results
    const resultFile = 'diagnostic-intelligence-result.json';
    fs.writeFileSync(resultFile, JSON.stringify(diagnosticResult, null, 2));
    console.log(`\n📊 Diagnostic results saved to ${resultFile}`);
    
    // Print summary
    console.log('\n📋 Summary:');
    console.log(`- Authentication: ${diagnosticResult.auth.status === 'ok' ? '✅ Successful' : '❌ Failed'}`);
    console.log(`- API Status: ${diagnosticResult.api.status === 200 ? '✅ 200 OK' : '❌ ' + diagnosticResult.api.status}`);
    console.log(`- Pairs Count: ${diagnosticResult.pairs_count}`);
    console.log(`- Unique KMAs: ${diagnosticResult.unique_kmas} ${diagnosticResult.unique_kmas >= 5 ? '✅' : '❌'}`);
    
    if (diagnosticResult.suggested_next_steps.length > 0) {
      console.log('\n📝 Suggested next steps:');
      diagnosticResult.suggested_next_steps.forEach((step, i) => {
        console.log(`  ${i+1}. ${step}`);
      });
    }
  }
}

// Run the verification
main().catch(console.error);