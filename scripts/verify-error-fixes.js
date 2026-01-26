// scripts/verify-error-fixes.js
/**
 * Verification script to test fixes for 500 Internal Server Errors, 422 KMA errors,
 * and authentication issues with the intelligence pairing API.
 */

import fetch from 'node-fetch';
import { adminSupabase } from '../utils/supabaseClient.js';

// Configuration options
const API_URL = process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
const TEST_MODE = process.env.ALLOW_TEST_MODE === 'true';
const VERIFICATION_KEY = process.env.VERIFICATION_API_KEY;

console.log('🧪 Starting verification of error handling fixes');
console.log(`🔧 Using API URL: ${API_URL}`);
console.log(`🔑 Test mode enabled: ${TEST_MODE}`);

// Test cases
const testCases = [
  {
    name: '1. Missing fields validation',
    endpoint: '/api/intelligence-pairing',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { test_mode: true },
    expectStatus: 400,
    validate: (response) => response.error && response.error.includes('Bad Request')
  },
  {
    name: '2. Invalid city validation',
    endpoint: '/api/intelligence-pairing',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      test_mode: true,
      originCity: 'NON_EXISTENT_CITY',
      originState: 'XY',
      destCity: 'ANOTHER_FAKE_CITY',
      destState: 'ZZ',
      equipmentCode: 'V'
    },
    expectStatus: 422,
    validate: (response) => response.error && response.status === 422
  },
  {
    name: '3. Authentication required check',
    endpoint: '/api/intelligence-pairing',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      originCity: 'Chicago',
      originState: 'IL',
      destCity: 'New York',
      destState: 'NY',
      equipmentCode: 'V'
    },
    expectStatus: 401,
    validate: (response) => response.error && response.error.includes('Unauthorized')
  },
  {
    name: '4. Test mode operation',
    endpoint: '/api/intelligence-pairing',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      test_mode: true,
      originCity: 'Chicago',
      originState: 'IL',
      destCity: 'Dallas',
      destState: 'TX',
      equipmentCode: 'V'
    },
    expectStatus: TEST_MODE ? 200 : 401, 
    validate: (response) => TEST_MODE ? response.success : response.error && response.error.includes('Unauthorized')
  }
];

// Run tests sequentially
async function runTests() {
  let passCount = 0;
  let failCount = 0;
  
  for (const test of testCases) {
    try {
      console.log(`\n🔍 Running test: ${test.name}`);
      const url = `${API_URL}${test.endpoint}`;
      
      console.log(`📤 Request: ${test.method} ${url}`);
      if (test.body) {
        console.log(`📦 Body: ${JSON.stringify(test.body)}`);
      }
      
      const response = await fetch(url, {
        method: test.method,
        headers: test.headers,
        body: test.body ? JSON.stringify(test.body) : undefined
      });
      
      const status = response.status;
      const data = await response.json().catch(() => ({ error: 'Invalid JSON response' }));
      
      console.log(`📥 Response status: ${status}`);
      console.log(`📄 Response body: ${JSON.stringify(data, null, 2)}`);
      
      // Check status code
      const statusMatch = status === test.expectStatus;
      
      // Run custom validation if provided
      const customValidation = test.validate ? test.validate(data) : true;
      
      if (statusMatch && customValidation) {
        console.log(`✅ Test passed: ${test.name}`);
        passCount++;
      } else {
        console.log(`❌ Test failed: ${test.name}`);
        console.log(`   Expected status: ${test.expectStatus}, got: ${status}`);
        if (!customValidation) {
          console.log(`   Custom validation failed`);
        }
        failCount++;
      }
    } catch (error) {
      console.error(`💥 Test error in "${test.name}":`, error);
      failCount++;
    }
  }
  
  // Final summary
  console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed`);
  
  if (failCount === 0) {
    console.log('🎉 All tests passed! Error handling is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please review the issues above.');
  }
}

// Run all tests
runTests().catch(error => {
  console.error('💥 Fatal error running tests:', error);
  process.exit(1);
});