#!/usr/bin/env node
/**
 * RapidRoutes Intelligence API Load Test
 * 
 * This script tests the performance and reliability of the intelligence-pairing API
 * under load by making multiple requests in parallel.
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

// Configuration - Use production Supabase URL and key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lbcydtbyqxorycrhehao.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiY3lkdGJ5cXhvcnljcmhlaGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc0MzA2NjksImV4cCI6MjAzMzAwNjY2OX0.JIliP9R_YO2nM9UFkXzLrEmZvVsN5dfukwb0axP4sWQ';
const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;

// Test configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api/intelligence-pairing';
const CONCURRENT_REQUESTS = process.env.CONCURRENT_REQUESTS ? parseInt(process.env.CONCURRENT_REQUESTS) : 5;
const TEST_LANES = [
  {
    originCity: 'Chicago',
    originState: 'IL',
    originZip: '60601',
    destCity: 'Atlanta', 
    destState: 'GA',
    destZip: '30303',
    equipmentCode: 'FD'
  },
  {
    originCity: 'Dallas',
    originState: 'TX',
    originZip: '75201',
    destCity: 'Phoenix', 
    destState: 'AZ',
    destZip: '85001',
    equipmentCode: 'FD'
  },
  {
    originCity: 'New York',
    originState: 'NY',
    originZip: '10001',
    destCity: 'Boston', 
    destState: 'MA',
    destZip: '02108',
    equipmentCode: 'V'
  },
  {
    originCity: 'Los Angeles',
    originState: 'CA',
    originZip: '90001',
    destCity: 'Seattle', 
    destState: 'WA',
    destZip: '98101',
    equipmentCode: 'R'
  },
  {
    originCity: 'Miami',
    originState: 'FL',
    originZip: '33101',
    destCity: 'Detroit', 
    destState: 'MI',
    destZip: '48201',
    equipmentCode: 'FD'
  }
];

/**
 * Authenticate with Supabase
 */
async function authenticate() {
  console.log('🔑 Authenticating with Supabase...');
  
  if (!EMAIL || !PASSWORD) {
    console.log('❌ Error: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required');
    console.log('Please set these environment variables before running:');
    console.log('export TEST_USER_EMAIL=your@email.com TEST_USER_PASSWORD=yourpassword');
    return null;
  }
  
  try {
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD
    });
    
    if (error) {
      console.log(`❌ Authentication failed: ${error.message}`);
      return null;
    }
    
    const session = data.session;
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