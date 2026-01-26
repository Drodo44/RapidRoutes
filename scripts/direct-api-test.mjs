#!/usr/bin/env node
/**
 * Direct API Test Script
 * 
 * This script tests the intelligence-pairing API directly without authentication
 * to see what kind of error responses we get
 */

import fetch from 'node-fetch';
import fs from 'fs';

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

// API URL
const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';

async function testDirectAPI() {
  console.log(`🔍 Testing API directly: ${API_URL}`);
  
  try {
    // Make request without authentication
    console.log('1️⃣ Testing without authentication...');
    const noAuthResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testLane)
    });
    
    const noAuthStatus = noAuthResponse.status;
    const noAuthText = await noAuthResponse.text();
    
    console.log(`- Status: ${noAuthStatus}`);
    console.log(`- Response: ${noAuthText}`);
    
    // Try with a fake Bearer token
    console.log('\n2️⃣ Testing with fake Bearer token...');
    const fakeTokenResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer fake-token-for-testing'
      },
      body: JSON.stringify(testLane)
    });
    
    const fakeTokenStatus = fakeTokenResponse.status;
    const fakeTokenText = await fakeTokenResponse.text();
    
    console.log(`- Status: ${fakeTokenStatus}`);
    console.log(`- Response: ${fakeTokenText}`);
    
    // Save results to file
    const diagnostics = {
      timestamp: new Date().toISOString(),
      api_url: API_URL,
      no_auth: {
        status: noAuthStatus,
        response: noAuthText
      },
      fake_token: {
        status: fakeTokenStatus,
        response: fakeTokenText
      },
      analysis: {
        auth_required: noAuthStatus === 401,
        token_validation_works: fakeTokenStatus === 401,
        appears_functional: noAuthStatus === 401 && fakeTokenStatus === 401
      }
    };
    
    fs.writeFileSync('api-direct-test-results.json', JSON.stringify(diagnostics, null, 2));
    console.log('\n📊 Results saved to api-direct-test-results.json');
    
    // Final analysis
    if (noAuthStatus === 401 && fakeTokenStatus === 401) {
      console.log('\n✅ Authentication appears to be properly configured');
      console.log('The API returns 401 Unauthorized as expected when no token or an invalid token is provided.');
      console.log('This indicates that token validation is working correctly.');
    } else {
      console.log('\n❌ Authentication may not be properly configured');
      console.log(`Expected 401 status codes, but received ${noAuthStatus} (no auth) and ${fakeTokenStatus} (fake token).`);
      console.log('This suggests issues with token validation or API configuration.');
    }
    
  } catch (error) {
    console.error(`❌ Error during API testing: ${error.message}`);
  }
}

// Run the test
testDirectAPI().catch(console.error);