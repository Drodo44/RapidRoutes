#!/usr/bin/env node
/**
 * Modified Verification Test Script
 * Tests the updated lane validation logic
 */

import fetch from 'node-fetch';
import fs from 'fs/promises';

// API URL
const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing?test_mode=true';

// Test cases covering different destination field combinations
const TEST_CASES = [
  {
    name: "Chicago to Atlanta (Full data)",
    data: {
      origin_city: "Chicago",
      origin_state: "IL",
      origin_zip: "60601",
      destination_city: "Atlanta",
      destination_state: "GA",
      destination_zip: "30303",
      equipment_code: "FD"
    },
    expectedResult: "success"
  },
  {
    name: "Los Angeles to Unknown (City only)",
    data: {
      origin_city: "Los Angeles",
      origin_state: "CA",
      origin_zip: "90001",
      destination_city: "Dallas",
      // destination_state omitted intentionally
      equipment_code: "V"
    },
    expectedResult: "success"
  },
  {
    name: "New York to Florida (State only)",
    data: {
      origin_city: "New York",
      origin_state: "NY",
      origin_zip: "10001",
      // destination_city omitted intentionally
      destination_state: "FL",
      equipment_code: "R"
    },
    expectedResult: "success"
  },
  {
    name: "Seattle to Nowhere (No destination)",
    data: {
      origin_city: "Seattle",
      origin_state: "WA",
      origin_zip: "98101",
      // No destination data
      equipment_code: "FD"
    },
    expectedResult: "fail"
  }
];

// Run the validation tests
async function runValidationTests() {
  console.log('\n🔍 LANE VALIDATION FIX VERIFICATION');
  console.log('==========================================');
  console.log(`📆 Date: ${new Date().toISOString()}`);
  console.log(`🌐 Testing API: ${API_URL}\n`);
  
  const results = [];
  
  for (const testCase of TEST_CASES) {
    console.log(`🚚 Testing: ${testCase.name}`);
    console.log(`📡 Sending request to API...`);
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Mode': 'true'
        },
        body: JSON.stringify({
          ...testCase.data,
          test_mode: true
        })
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
          console.log(`✅ SUCCESS as expected: ${JSON.stringify(data.success)}`);
        } else {
          console.log(`✅ FAIL as expected: ${JSON.stringify(data.error)}`);
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
    
    console.log('-------------------------------------------');
  }
  
  // Summary
  const passedCount = results.filter(r => r.passed).length;
  
  console.log('\n📊 VALIDATION TEST SUMMARY:');
  console.log('---------------------');
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}: Expected ${result.expected}, got ${result.actual}`);
  });
  
  console.log(`\n📈 PASSED: ${passedCount}/${results.length} (${Math.round(passedCount/results.length*100)}%)`);
  console.log(`\n${passedCount === results.length ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED'}`);
  
  // Save detailed results
  await fs.writeFile('validation-fix-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Detailed results saved to validation-fix-results.json');
  
  return passedCount === results.length;
}

// Execute tests
runValidationTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`❌ Test execution failed: ${error.message}`);
    process.exit(1);
  });