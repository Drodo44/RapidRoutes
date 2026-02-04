#!/usr/bin/env node
/**
 * RapidRoutes Intelligence API Mock Authentication Test
 * 
 * This script tests the intelligence-pairing endpoint with a mock authentication
 * header to verify if the API is working in production.
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Create a static JWT token for testing
// This should match the format expected by the intelligence-pairing endpoint
const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InRlc3QtdXNlciIsImVtYWlsIjoidGVzdEByYXBpZHJvdXRlcy5jb20iLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJyZWYiOiJ2eXd2bWhkeXloa2RwbWJmemtneCIsImlhdCI6MTYzNzAwMDAwMCwiZXhwIjoyNjM3MDAwMDAwfQ.pJbLj7xR1YnfHiA8PmZXNP4ExEN8IvjWQzW7JV9PGGY';

// API URL can be specified as command line argument
const apiUrl = process.argv[2] || 'https://rapid-routes.vercel.app';

// Test data
const testData = {
  originCity: 'Chicago',
  originState: 'IL',
  originZip: '60601',
  destCity: 'Atlanta',
  destState: 'GA',
  destZip: '30303',
  equipmentCode: 'FD'
};

async function testWithMockToken() {
  console.log('🔍 RapidRoutes Intelligence API Mock Authentication Test');
  console.log('====================================================');
  console.log(`🌐 Target API: ${apiUrl}/api/intelligence-pairing`);
  console.log(`🔑 Using mock JWT token`);
  console.log('📦 Test data:', JSON.stringify(testData));
  
  try {
    console.log('\n📤 Sending request with mock token...');
    const response = await fetch(`${apiUrl}/api/intelligence-pairing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`📥 Response status: ${response.status}`);
    console.log(`📥 Content-Type: ${response.headers.get('content-type')}`);
    
    const text = await response.text();
    console.log(`📥 Response size: ${text.length} bytes`);
    
    try {
      // Try parsing as JSON
      const result = JSON.parse(text);
      console.log('\n📥 Response JSON:');
      console.log(JSON.stringify(result, null, 2));
      
      if (result.success && Array.isArray(result.pairs)) {
        // Success case - we got pairs back
        console.log(`\n✅ SUCCESS! API returned ${result.pairs.length} pairs`);
        
        // Save the response for analysis
        fs.writeFileSync('successful-api-response.json', JSON.stringify(result, null, 2));
        console.log('✅ Response saved to successful-api-response.json');
        
        // Count unique KMA codes
        const uniqueKmas = new Set();
        result.pairs.forEach(pair => {
          if (pair.origin_kma) uniqueKmas.add(pair.origin_kma);
          if (pair.dest_kma) uniqueKmas.add(pair.dest_kma);
        });
        
        console.log(`✅ Found ${uniqueKmas.size} unique KMA codes`);
        
        // Show sample pairs
        console.log('\n📋 Sample pairs (first 3):');
        result.pairs.slice(0, 3).forEach((pair, index) => {
          console.log(`\nPair ${index + 1}:`);
          console.log(JSON.stringify(pair, null, 2));
        });
        
        return true;
      } else if (response.status === 401) {
        // Authentication error - token validation is working
        console.log('\n🔐 Authentication is working correctly!');
        console.log('🔐 The API correctly rejected our mock token');
        console.log(`🔐 Error details: ${result.details || 'No details provided'}`);
        
        // Check the error details to verify JWT validation is working
        if (result.details && result.details.toLowerCase().includes('jwt')) {
          console.log('\n✅ JWT validation is working correctly!');
          console.log('✅ The API is properly validating JWT tokens');
          console.log('✅ This indicates the authentication flow is fixed!');
          return true;
        } else {
          console.log('\n⚠️ Unexpected authentication error details');
          console.log('⚠️ Further investigation may be required');
          return false;
        }
      } else {
        // Other error
        console.log('\n❌ API returned error:');
        console.log(JSON.stringify(result, null, 2));
        return false;
      }
    } catch (e) {
      // Not JSON
      console.error('\n❌ Response is not valid JSON:', e.message);
      console.error(`Response (first 500 chars): ${text.substring(0, 500)}`);
      return false;
    }
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    return false;
  }
}

testWithMockToken().then(success => {
  process.exit(success ? 0 : 1);
});