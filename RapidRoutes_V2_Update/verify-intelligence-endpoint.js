#!/usr/bin/env node
/**
 * Direct API test for RapidRoutes intelligence-pairing endpoint
 * This is a simplified test that doesn't rely on Supabase authentication
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';

// Test payload
const TEST_PAYLOAD = {
  originCity: 'Chicago',
  originState: 'IL',
  originZip: '60601',
  destCity: 'Atlanta',
  destState: 'GA',
  destZip: '30303',
  equipmentCode: 'FD' // Flatbed equipment code
};

async function directApiTest() {
  console.log('🔍 Direct API Test - RapidRoutes Intelligence Endpoint');
  console.log(`🌐 Target: ${API_URL}`);
  console.log(`📤 Request payload:`, JSON.stringify(TEST_PAYLOAD, null, 2));
  
  try {
    // First, make a simple OPTIONS request to check if the endpoint is accessible
    console.log(`\n📡 Testing endpoint accessibility with OPTIONS request...`);
    const optionsResponse = await fetch(API_URL, { 
      method: 'OPTIONS',
      headers: { 'Origin': 'https://rapid-routes.vercel.app' }
    });
    
    console.log(`📥 OPTIONS status: ${optionsResponse.status} ${optionsResponse.statusText}`);
    
    // Make the POST request without authentication (expecting 401)
    console.log(`\n📡 Making unauthenticated POST request (expecting 401)...`);
    const unauthResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_PAYLOAD)
    });
    
    console.log(`📥 Response status: ${unauthResponse.status} ${unauthResponse.statusText}`);
    console.log(`📥 Response headers:`, {
      'content-type': unauthResponse.headers.get('content-type'),
      'server': unauthResponse.headers.get('server')
    });
    
    // Get response text
    const responseText = await unauthResponse.text();
    
    // Try to parse as JSON
    try {
      const result = JSON.parse(responseText);
      console.log(`📥 Response is valid JSON:`, result);
      
      // Check if authentication error has correct format
      if (unauthResponse.status === 401 && result.error === 'Unauthorized') {
        console.log(`\n✅ API AUTHENTICATION VERIFIED: The endpoint correctly returns a 401 with proper JSON format`);
        console.log(`✅ Details: ${result.details || 'No details provided'}`);
        console.log(`✅ This confirms API routes are properly deployed and the authentication flow is working`);
        console.log(`✅ Next step: Use a valid authentication token to get successful results`);
        
        return true;
      } else {
        console.log(`\n⚠️ Unexpected response format: Expected 401 Unauthorized but got ${unauthResponse.status}`);
        console.log(`📥 Response:`, result);
      }
    } catch (parseError) {
      console.error(`❌ Response is not valid JSON:`, parseError.message);
      console.error(`Response content (first 300 chars):\n${responseText.substring(0, 300)}...`);
      
      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
        console.error(`\n❌ CRITICAL ERROR: Received HTML response instead of JSON`);
        console.error(`👉 This indicates the Vercel deployment fix has not been applied or has not completed deployment`);
        console.error(`👉 Please run the fix-deployment.js script, commit the changes, and wait for deployment to complete`);
      }
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    return false;
  }
}

directApiTest();