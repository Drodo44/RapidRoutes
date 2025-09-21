#!/usr/bin/env node
/**
 * RapidRoutes Intelligence Pairing Quick Verification
 * This script tests if the /api/intelligence-pairing endpoint responds properly
 * without requiring authentication (will expect 401, but with proper structure)
 * 
 * Usage: 
 * node verify-endpoint.js <vercel-url>
 * 
 * Example:
 * node verify-endpoint.js https://rapidroutes.vercel.app
 */

import fetch from 'node-fetch';

const [,, vercelUrl = 'http://localhost:3000'] = process.argv;

async function quickVerifyEndpoint() {
  console.log(`🔍 Quick verification of intelligence-pairing API at ${vercelUrl}`);
  
  const testData = {
    originCity: 'Chicago',
    originState: 'IL',
    originZip: '60601',
    destCity: 'Atlanta',
    destState: 'GA',
    destZip: '30303',
    equipmentCode: 'FD'
  };
  
  console.log(`📤 Sending request with test data (expecting 401 Unauthorized)`);
  
  try {
    const response = await fetch(`${vercelUrl}/api/intelligence-pairing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData),
    });
    
    console.log(`📥 Response status: ${response.status}`);
    
    // Try to get the response text first
    const responseText = await response.text();
    console.log(`Response body (text): ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
    
    // Try to parse as JSON if possible
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error(`❌ Response is not valid JSON:`, e.message);
      process.exit(1);
    }
    
    console.log(`📥 Response status: ${response.status}`);
    
    // For unauthenticated requests, we expect a 401 with proper structure
    if (response.status === 401) {
      console.log(`✅ Authentication check working properly. Received 401 Unauthorized as expected.`);
      console.log(`✅ Response structure:`, JSON.stringify(result, null, 2));
      
      // Verify response has expected fields
      if (result.error === 'Unauthorized' && result.details) {
        console.log(`✅ Response format correct with error='Unauthorized' and details field`);
        console.log(`✅ API is responding properly to authentication requests`);
      } else {
        console.error(`❌ Response format incorrect. Expected error='Unauthorized' with details`);
        console.error(`Actual response:`, JSON.stringify(result, null, 2));
      }
    } else {
      console.error(`❌ Expected 401 status, but got ${response.status}`);
      console.error(`Response:`, JSON.stringify(result, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ API verification failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

quickVerifyEndpoint();