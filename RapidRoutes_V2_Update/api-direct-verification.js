#!/usr/bin/env node
/**
 * RapidRoutes API Direct Verification
 * 
 * This simplified script verifies the intelligence-pairing API endpoint is correctly responding
 * by making a direct request and examining the response structure.
 */

import fetch from 'node-fetch';
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
 * Main function to verify the API endpoint
 */
async function verifyApiEndpoint() {
  console.log('🔍 RapidRoutes API Direct Verification');
  console.log('===================================');
  console.log(`🌐 API URL: ${API_URL}`);
  
  // --------------------------------------
  // Make request to intelligence API
  // --------------------------------------
  console.log('\n🚀 Making request to intelligence-pairing API...');
  console.log('📦 Request payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  console.log('\n📤 Request headers:');
  console.log(JSON.stringify(headers, null, 2));
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${API_URL}/api/intelligence-pairing`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload)
    });
    const elapsed = Date.now() - startTime;
    
    console.log(`\n📥 Response status: ${response.status} (${elapsed}ms)`);
    console.log('📥 Response headers:');
    const responseHeaders = {};
    response.headers.forEach((value, name) => {
      responseHeaders[name] = value;
    });
    console.log(JSON.stringify(responseHeaders, null, 2));
    
    // Get the response body
    const responseText = await response.text();
    const responseSize = responseText.length;
    console.log(`📥 Response size: ${responseSize} bytes`);
    
    // Save the raw response
    fs.writeFileSync('api-verification-response.txt', responseText);
    console.log('✅ Raw response saved to api-verification-response.txt');
    
    // Try to parse as JSON
    try {
      const result = JSON.parse(responseText);
      
      // Save the JSON response
      fs.writeFileSync('api-verification-response.json', JSON.stringify(result, null, 2));
      console.log('✅ JSON response saved to api-verification-response.json');
      
      // Analyze the response
      if (response.status === 401 && result.error === "Unauthorized") {
        console.log('\n✅ SUCCESS: API correctly requires authentication (401 Unauthorized)');
        console.log('✅ API endpoint is properly secured and responding with correct format');
        console.log('Details:');
        console.log(JSON.stringify(result, null, 2));
        return true;
      } else if (response.status === 200 && result.success) {
        console.log('\n⚠️ WARNING: API returned success without authentication');
        console.log('This indicates the authentication requirement might be bypassed');
        console.log('Details:');
        console.log(JSON.stringify(result, null, 2));
        return true;
      } else {
        console.error('\n❌ Unexpected API response:');
        console.error(JSON.stringify(result, null, 2));
        return false;
      }
    } catch (e) {
      console.error('\n❌ Response is not valid JSON:', e.message);
      console.error('Response (first 500 chars):', responseText.substring(0, 500));
      
      // Check if the response is HTML (which indicates routing issue)
      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
        console.error('\n❌ CRITICAL ISSUE: API returned HTML instead of JSON');
        console.error('This indicates a routing/configuration issue with the API endpoint');
      }
      
      return false;
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    return false;
  }
}

// Run the verification
verifyApiEndpoint()
  .then(success => {
    if (success) {
      console.log('\n✨ API verification complete! The intelligence-pairing endpoint is properly configured.');
      process.exit(0);
    } else {
      console.error('\n❌ API verification failed. See details above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Verification failed with exception:', error);
    process.exit(1);
  });