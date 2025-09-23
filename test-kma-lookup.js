// test-kma-lookup.js
// Script to test the KMA lookup API endpoint

import fetch from 'node-fetch';
import { getCurrentToken } from './utils/authUtils.js';

// Sample payload from the logs
const payload = {
  "lane_id": "61f287f5-278a-4277-b3fe-9055aad1fec8",
  "origin_city": "Riegelwood",
  "origin_state": "NC",
  "destination_city": "Massillon",
  "destination_state": "OH",
  "equipment_code": "V"
};

// Function to test the API endpoint
async function testKmaLookup() {
  try {
    // Get the authentication token
    const auth = await getCurrentToken();
    
    if (!auth.token) {
      console.error('❌ No authentication token available:', auth.error || 'Unknown error');
      return;
    }
    
    console.log('🔐 Authentication token obtained successfully');
    
    // API endpoint URL - first try local, then production
    const apiUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000/api/kma-lookup'
      : 'https://rapid-routes.vercel.app/api/kma-lookup';
    
    console.log(`🔄 Sending request to: ${apiUrl}`);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    // Send the request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.token}`
      },
      body: JSON.stringify(payload)
    });
    
    // Parse the response
    const result = await response.json();
    
    // Log the status and response
    console.log(`🛎️ Response status: ${response.status} ${response.statusText}`);
    console.log('📋 Response body:', JSON.stringify(result, null, 2));
    
    // Check if the response is successful
    if (response.ok && result.success) {
      console.log('✅ KMA lookup successful:');
      console.log(`   Origin: ${result.origin.city}, ${result.origin.state} → KMA: ${result.origin.kma_code} (${result.origin.kma_name})`);
      console.log(`   Destination: ${result.destination.city}, ${result.destination.state} → KMA: ${result.destination.kma_code} (${result.destination.kma_name})`);
    } else {
      console.error('❌ KMA lookup failed:', result.error || 'Unknown error');
      console.error('   Details:', result.details || 'No details provided');
    }
    
  } catch (error) {
    console.error('❌ Test failed with an exception:', error);
  }
}

// Run the test
testKmaLookup();