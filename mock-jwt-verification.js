#!/usr/bin/env node
/**
 * RapidRoutes Mock JWT Verification
 * 
 * This script tests the authentication handling of the intelligence-pairing endpoint
 * by sending various mock JWT tokens and analyzing the responses.
 */

import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import fs from 'fs';

const API_URL = 'https://rapid-routes.vercel.app';

// Test data
const testPayload = {
  originCity: "Chicago",
  originState: "IL",
  originZip: "60601",
  destCity: "Atlanta",
  destState: "GA",
  destZip: "30303",
  equipmentCode: "FD"
};

/**
 * Create a mock JWT token
 */
function createMockToken(payload = {}, secretKey = 'mock-secret-key') {
  const defaultPayload = {
    iss: 'supabase',
    ref: 'vywvmhdyyhkdpmbfzkgx',
    role: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: 'mock-user-id',
    email: 'test-user@rapidroutes-verification.com'
  };
  
  const finalPayload = { ...defaultPayload, ...payload };
  return jwt.sign(finalPayload, secretKey);
}

/**
 * Make a request with the given token
 */
async function makeRequest(token = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_URL}/api/intelligence-pairing`, {
    method: 'POST',
    headers,
    body: JSON.stringify(testPayload)
  });
  
  const responseText = await response.text();
  let result;
  
  try {
    result = JSON.parse(responseText);
  } catch (e) {
    result = { error: 'Invalid JSON', text: responseText.substring(0, 500) };
  }
  
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    result
  };
}

/**
 * Test the endpoint with different token scenarios
 */
async function testAuthenticationScenarios() {
  console.log('🔍 RapidRoutes Mock JWT Verification');
  console.log('===================================');
  console.log(`🌐 API URL: ${API_URL}`);
  
  const results = {};
  
  // Test 1: No authentication
  console.log('\n🧪 Test 1: No authentication token');
  results.noToken = await makeRequest();
  console.log(`📥 Response status: ${results.noToken.status}`);
  console.log('Result:', JSON.stringify(results.noToken.result, null, 2));
  
  // Test 2: Well-formed but invalid token
  console.log('\n🧪 Test 2: Well-formed but invalid token');
  const mockToken = createMockToken();
  results.mockToken = await makeRequest(mockToken);
  console.log(`📥 Response status: ${results.mockToken.status}`);
  console.log('Result:', JSON.stringify(results.mockToken.result, null, 2));
  
  // Test 3: Malformed token
  console.log('\n🧪 Test 3: Malformed token');
  results.malformedToken = await makeRequest('not-a-valid-jwt-token');
  console.log(`📥 Response status: ${results.malformedToken.status}`);
  console.log('Result:', JSON.stringify(results.malformedToken.result, null, 2));
  
  // Analyze results
  let allTestsPassed = true;
  
  // Test for proper 401 responses
  if (results.noToken.status === 401 && 
      results.mockToken.status === 401 && 
      results.malformedToken.status === 401) {
    console.log('\n✅ SUCCESS: API correctly returns 401 for all unauthorized requests');
  } else {
    console.log('\n❌ FAILURE: API does not consistently return 401 for unauthorized requests');
    allTestsPassed = false;
  }
  
  // Test for proper error formatting
  const hasProperErrorFormat = Object.values(results).every(r => 
    r.result && 
    typeof r.result.error === 'string' && 
    r.result.success === false
  );
  
  if (hasProperErrorFormat) {
    console.log('✅ SUCCESS: API returns properly formatted error responses');
  } else {
    console.log('❌ FAILURE: API error responses are not consistently formatted');
    allTestsPassed = false;
  }
  
  // Save detailed results
  fs.writeFileSync(
    'mock-jwt-verification-results.json', 
    JSON.stringify(results, null, 2)
  );
  console.log('\n✅ Detailed results saved to mock-jwt-verification-results.json');
  
  return {
    success: allTestsPassed,
    results
  };
}

// Run all tests
testAuthenticationScenarios()
  .then(({success}) => {
    if (success) {
      console.log('\n🎉 All authentication tests passed! The API endpoint is properly validating tokens.');
      process.exit(0);
    } else {
      console.error('\n❌ Some authentication tests failed. See details above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Tests failed with exception:', error);
    process.exit(1);
  });