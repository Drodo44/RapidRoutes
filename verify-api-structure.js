#!/usr/bin/env node
/**
 * RapidRoutes API Endpoint Structure Verification
 * This simple script just checks if the API endpoints are correctly set up in the production deployment
 * without requiring authentication
 */

import fetch from 'node-fetch';

const apiUrl = process.argv[2] || 'https://rapid-routes.vercel.app';

async function verifyApiStructure() {
  console.log(`🔍 Checking API structure at ${apiUrl}`);
  
  // Test endpoints to verify
  const endpoints = [
    '/api/deployment-verification',
    '/api/health',
    '/api/simple-test',
    '/api/intelligence-pairing'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing endpoint: ${endpoint}`);
      
      // For intelligence-pairing, use POST with minimal data
      const method = endpoint === '/api/intelligence-pairing' ? 'POST' : 'GET';
      const headers = { 'Content-Type': 'application/json' };
      const body = method === 'POST' ? JSON.stringify({
        originCity: 'Chicago',
        originState: 'IL',
        destCity: 'Atlanta',
        destState: 'GA'
      }) : undefined;
      
      console.log(`Request: ${method} ${apiUrl}${endpoint}`);
      const response = await fetch(`${apiUrl}${endpoint}`, { method, headers, body });
      
      console.log(`Response status: ${response.status}`);
      console.log(`Content-Type: ${response.headers.get('content-type')}`);
      
      // Try to get the response as text first
      const text = await response.text();
      
      // See if it's valid JSON
      try {
        const json = JSON.parse(text);
        console.log(`✅ Endpoint returns valid JSON response`);
        console.log(`Response: ${JSON.stringify(json, null, 2).substring(0, 300)}...`);
        
        // Special handling for intelligence-pairing which should return 401 for unauthenticated requests
        if (endpoint === '/api/intelligence-pairing') {
          if (response.status === 401 && json.error === 'Unauthorized') {
            console.log(`✅ Authentication check working as expected (401 Unauthorized)`);
          } else {
            console.warn(`⚠️ Expected 401 Unauthorized for unauthenticated request to ${endpoint}`);
          }
        }
      } catch (e) {
        console.error(`❌ Endpoint returns non-JSON response (first 300 chars):`);
        console.error(text.substring(0, 300));
        console.error(`\n⚠️ This suggests API routes are not properly deployed or configured`);
      }
    } catch (error) {
      console.error(`❌ Error testing ${endpoint}: ${error.message}`);
    }
  }
}

verifyApiStructure().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});