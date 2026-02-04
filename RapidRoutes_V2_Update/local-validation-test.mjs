#!/usr/bin/env node
/**
 * Local Validation Test Script
 * Tests the updated lane validation logic locally
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

// Local API URL
const API_URL = 'http://localhost:3000/api/intelligence-pairing';

// Test cases covering different destination field combinations
const TEST_CASES = [
  {
    name: "Complete destination data",
    data: {
      origin_city: "Chicago",
      origin_state: "IL",
      origin_zip: "60601",
      destination_city: "Atlanta", 
      destination_state: "GA",
      destination_zip: "30303",
      equipment_code: "FD",
      test_mode: true,
      debug: true
    },
    expectedResult: "success"
  },
  {
    name: "Only destination city",
    data: {
      origin_city: "Los Angeles",
      origin_state: "CA",
      origin_zip: "90001",
      destination_city: "Dallas",
      // No destination_state
      equipment_code: "V",
      test_mode: true,
      debug: true
    },
    expectedResult: "success"
  },
  {
    name: "Only destination state",
    data: {
      origin_city: "New York",
      origin_state: "NY",
      origin_zip: "10001",
      // No destination_city
      destination_state: "FL",
      equipment_code: "R",
      test_mode: true,
      debug: true
    },
    expectedResult: "success"
  },
  {
    name: "No destination data",
    data: {
      origin_city: "Seattle",
      origin_state: "WA",
      origin_zip: "98101",
      // No destination data
      equipment_code: "FD",
      test_mode: true,
      debug: true
    },
    expectedResult: "fail"
  }
];

console.log('\n🔍 LOCAL VALIDATION TEST');
console.log('==========================================');
console.log(`📆 Date: ${new Date().toISOString()}`);
console.log(`🌐 Testing API: ${API_URL}\n`);
console.log('ℹ️ Make sure your local Next.js server is running (npm run dev)\n');

// Function to start local Next.js server if not already running
async function ensureLocalServerRunning() {
  try {
    console.log('🔍 Checking if local server is running...');
    const response = await fetch('http://localhost:3000/api/health-check', { 
      method: 'GET',
      timeout: 2000 
    });
    
    if (response.ok) {
      console.log('✅ Local server is running');
      return true;
    } else {
      console.log('❌ Local server returned error status');
      return false;
    }
  } catch (error) {
    console.log('❌ Local server not detected. Please start it with "npm run dev"');
    return false;
  }
}

// Run test cases
async function runTests() {
  // Check if server is running
  const isServerRunning = await ensureLocalServerRunning();
  if (!isServerRunning) {
    console.log('⚠️ Please start the Next.js server with "npm run dev" and try again');
    return false;
  }
  
  const results = [];
  
  for (const testCase of TEST_CASES) {
    console.log(`\n🚚 Testing: ${testCase.name}`);
    console.log(`📡 Sending request to API...`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Mode': 'true'
        },
        body: JSON.stringify(testCase.data)
      });
      
      const responseTime = Date.now() - startTime;
      console.log(`⏱️ Response received in ${responseTime}ms with status ${response.status}`);
      
      const data = await response.json();
      
      // Process response
      const isSuccess = response.status >= 200 && response.status < 300;
      const expectedSuccess = testCase.expectedResult === 'success';
      const testPassed = isSuccess === expectedSuccess;
      
      if (testPassed) {
        if (isSuccess) {
          console.log(`✅ SUCCESS as expected: ${JSON.stringify(data.success || data)}`);
        } else {
          console.log(`✅ FAIL as expected: ${JSON.stringify(data.error || data)}`);
        }
      } else {
        if (isSuccess) {
          console.log(`❌ UNEXPECTED SUCCESS: ${JSON.stringify(data)}`);
        } else {
          console.log(`❌ UNEXPECTED FAILURE: ${JSON.stringify(data)}`);
        }
      }
      
      results.push({
        name: testCase.name,
        expected: testCase.expectedResult,
        actual: isSuccess ? 'success' : 'fail',
        passed: testPassed,
        responseTime,
        data
      });
    } catch (error) {
      console.error(`❌ Request failed: ${error.message}`);
      
      results.push({
        name: testCase.name,
        expected: testCase.expectedResult,
        actual: 'error',
        passed: false,
        error: error.message
      });
    }
  }
  
  // Summary
  const passedCount = results.filter(r => r.passed).length;
  
  console.log('\n📊 LOCAL TEST SUMMARY:');
  console.log('---------------------');
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}: Expected ${result.expected}, got ${result.actual}`);
  });
  
  console.log(`\n📈 PASSED: ${passedCount}/${results.length} (${Math.round(passedCount/results.length*100)}%)`);
  console.log(`\n${passedCount === results.length ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'}`);
  
  // Save detailed results
  await fs.writeFile('local-validation-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Detailed results saved to local-validation-results.json');
  
  return passedCount === results.length;
}

// Execute tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`❌ Test execution failed: ${error.message}`);
    process.exit(1);
  });