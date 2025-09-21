#!/usr/bin/env node
/**
 * RapidRoutes Intelligence API Load Test
 * 
 * This script tests the performance and reliability of the intelligence-pairing API
 * under load by making multiple requests in parallel using production credentials.
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';

// Configuration - Use Vercel environment variables directly
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test configuration
const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';
const CONCURRENT_REQUESTS = 3; // Reduced to avoid rate limiting
const MIN_UNIQUE_KMAS = 6; // Required minimum unique KMAs

// Test lanes with diverse geographic coverage
const TEST_LANES = [
  {
    name: "Chicago to Atlanta (Flatbed)",
    data: {
      originCity: 'Chicago',
      originState: 'IL',
      originZip: '60601',
      destCity: 'Atlanta', 
      destState: 'GA',
      destZip: '30303',
      equipmentCode: 'FD'
    }
  },
  {
    name: "Dallas to Phoenix (Flatbed)",
    data: {
      originCity: 'Dallas',
      originState: 'TX',
      originZip: '75201',
      destCity: 'Phoenix', 
      destState: 'AZ',
      destZip: '85001',
      equipmentCode: 'FD'
    }
  },
  {
    name: "New York to Boston (Van)",
    data: {
      originCity: 'New York',
      originState: 'NY',
      originZip: '10001',
      destCity: 'Boston', 
      destState: 'MA',
      destZip: '02108',
      equipmentCode: 'V'
    }
  },
  {
    name: "Los Angeles to Seattle (Reefer)",
    data: {
      originCity: 'Los Angeles',
      originState: 'CA',
      originZip: '90001',
      destCity: 'Seattle', 
      destState: 'WA',
      destZip: '98101',
      equipmentCode: 'R'
    }
  },
  {
    name: "Miami to Detroit (Flatbed)",
    data: {
      originCity: 'Miami',
      originState: 'FL',
      originZip: '33101',
      destCity: 'Detroit', 
      destState: 'MI',
      destZip: '48201',
      equipmentCode: 'FD'
    }
  }
];

/**
 * Helper function to count unique KMAs in response
 */
function countUniqueKmas(pairs) {
  if (!pairs || !Array.isArray(pairs)) return { uniqueCount: 0, kmas: [] };
  
  const allKmas = new Set();
  
  pairs.forEach(pair => {
    // Handle both snake_case and camelCase formats
    const originKma = pair.origin?.kma_code || pair.origin?.kmaCode || 
                     pair.originKma || pair.origin_kma;
    const destKma = pair.destination?.kma_code || pair.destination?.kmaCode || 
                   pair.destKma || pair.dest_kma;
    
    if (originKma) allKmas.add(originKma);
    if (destKma) allKmas.add(destKma);
  });
  
  return {
    uniqueCount: allKmas.size,
    kmas: Array.from(allKmas)
  };
}

/**
 * Authenticate with Supabase using service role
 */
async function authenticate() {
  console.log('🔑 Authenticating with Supabase using service role...');
  
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.log('❌ Error: Required environment variables missing');
    console.log('Please ensure these environment variables are set:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL');
    console.log('- SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }
  
  try {
    // Create admin client with service role key
    const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // Create a test user
    const testEmail = `test-user-${Date.now()}@rapidroutes-verify.com`;
    const testPassword = `Test${Date.now()}!`;
    
    console.log(`Creating test user: ${testEmail}...`);
    
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });
    if (!session?.access_token) {
      console.log('❌ No access token in session');
      return null;
    }
    
    console.log('✅ Authentication successful!');
    return session.access_token;
  } catch (err) {
    console.log(`❌ Error during authentication: ${err.message}`);
    return null;
  }
}

/**
 * Make a request to the API with a specific lane
 */
async function makeRequest(token, lane, index) {
  const label = `Lane ${index+1}: ${lane.originCity}, ${lane.originState} to ${lane.destCity}, ${lane.destState}`;
  console.log(`🚀 Testing ${label}...`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(lane)
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (!response.ok) {
      const text = await response.text();
      console.log(`❌ ${label} - API call failed with status ${response.status} (${duration}ms)`);
      console.log(`Error: ${text}`);
      return { 
        success: false, 
        lane, 
        duration,
        error: text,
        status: response.status
      };
    }
    
    const data = await response.json();
    
    // Check KMA requirements
    const uniqueKmas = new Set();
    if (data.pairs && Array.isArray(data.pairs)) {
      data.pairs.forEach(pair => {
        const originKma = pair.origin_kma || pair.originKma;
        const destKma = pair.dest_kma || pair.destKma;
        
        if (originKma) uniqueKmas.add(originKma);
        if (destKma) uniqueKmas.add(destKma);
      });
    }
    
    const isValid = uniqueKmas.size >= 5;
    console.log(`${isValid ? '✅' : '❌'} ${label} - ${data.pairs?.length || 0} pairs with ${uniqueKmas.size} KMAs in ${duration}ms`);
    
    return { 
      success: true, 
      valid: isValid,
      lane, 
      duration,
      pairCount: data.pairs?.length || 0,
      kmaCount: uniqueKmas.size
    };
  } catch (error) {
    console.log(`❌ ${label} - Error: ${error.message}`);
    return { 
      success: false, 
      lane, 
      error: error.message 
    };
  }
}

/**
 * Run the load test with multiple concurrent requests
 */
async function runLoadTest(token) {
  console.log(`\n🔥 Starting load test with ${CONCURRENT_REQUESTS} concurrent requests...\n`);
  
  const startTime = Date.now();
  const results = [];
  
  // Run requests in batches to avoid overwhelming the server
  for (let i = 0; i < TEST_LANES.length; i += CONCURRENT_REQUESTS) {
    const batch = TEST_LANES.slice(i, i + CONCURRENT_REQUESTS);
    
    const batchPromises = batch.map((lane, idx) => 
      makeRequest(token, lane, i + idx)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  const endTime = Date.now();
  const totalDuration = endTime - startTime;
  
  return { results, totalDuration };
}

/**
 * Generate a summary report of the load test
 */
function generateReport(results, totalDuration) {
  const successCount = results.filter(r => r.success).length;
  const validCount = results.filter(r => r.valid).length;
  const failureCount = results.length - successCount;
  
  const avgDuration = results
    .filter(r => r.duration)
    .reduce((sum, r) => sum + r.duration, 0) / successCount;
  
  const avgPairs = results
    .filter(r => r.pairCount)
    .reduce((sum, r) => sum + r.pairCount, 0) / successCount;
  
  const avgKmas = results
    .filter(r => r.kmaCount)
    .reduce((sum, r) => sum + r.kmaCount, 0) / successCount;
  
  console.log('\n📊 LOAD TEST SUMMARY');
  console.log('===================');
  console.log(`Total requests: ${results.length}`);
  console.log(`Successful requests: ${successCount} (${(successCount/results.length*100).toFixed(1)}%)`);
  console.log(`Valid responses (5+ KMAs): ${validCount} (${(validCount/results.length*100).toFixed(1)}%)`);
  console.log(`Failed requests: ${failureCount}`);
  console.log(`Total duration: ${totalDuration}ms`);
  console.log(`Average response time: ${avgDuration.toFixed(1)}ms`);
  console.log(`Average pairs per response: ${avgPairs.toFixed(1)}`);
  console.log(`Average unique KMAs per response: ${avgKmas.toFixed(1)}`);
  
  if (successCount === results.length && validCount === results.length) {
    console.log('\n✅ All requests were successful and valid!');
  } else {
    console.log('\n⚠️ Some requests failed or returned invalid responses.');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n🚚 RapidRoutes Intelligence API Load Test\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Concurrent requests: ${CONCURRENT_REQUESTS}`);
  console.log(`Test lanes: ${TEST_LANES.length}`);
  
  // Step 1: Authenticate
  const token = await authenticate();
  if (!token) {
    process.exit(1);
  }
  
  // Step 2: Run load test
  const { results, totalDuration } = await runLoadTest(token);
  
  // Step 3: Generate report
  generateReport(results, totalDuration);
}

// Run the script
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});