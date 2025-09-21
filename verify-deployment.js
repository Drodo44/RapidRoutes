#!/usr/bin/env node
/**
 * RapidRoutes Deployment Verification
 * This script checks if the Vercel deployment is correctly set up for Next.js API routes
 */

import fetch from 'node-fetch';

const [,, vercelUrl = 'https://rapidroutes.vercel.app'] = process.argv;

async function checkDeployment() {
  console.log(`🔍 Checking deployment configuration at ${vercelUrl}`);
  
  // First check if the main website loads
  try {
    console.log(`📤 Testing main website`);
    const homeResponse = await fetch(vercelUrl);
    console.log(`📥 Home page status: ${homeResponse.status}`);
    console.log(`📄 Content type: ${homeResponse.headers.get('content-type')}`);
    
    if (homeResponse.headers.get('content-type').includes('text/html')) {
      console.log(`✅ Main website loads correctly (HTML)`);
    } else {
      console.log(`❌ Main website unexpected content type`);
    }
    
    // Now test with OPTIONS request (pre-flight)
    console.log(`\n📤 Testing OPTIONS request to API`);
    const optionsResponse = await fetch(`${vercelUrl}/api/intelligence-pairing`, {
      method: 'OPTIONS',
      headers: {
        'Origin': vercelUrl,
      }
    });
    
    console.log(`📥 OPTIONS status: ${optionsResponse.status}`);
    console.log(`📄 CORS headers:`, {
      'access-control-allow-origin': optionsResponse.headers.get('access-control-allow-origin'),
      'access-control-allow-methods': optionsResponse.headers.get('access-control-allow-methods'),
      'access-control-allow-headers': optionsResponse.headers.get('access-control-allow-headers')
    });
    
    // Test with non-JSON POST (should get 400 for missing body)
    console.log(`\n📤 Testing POST with invalid content type`);
    const invalidPostResponse = await fetch(`${vercelUrl}/api/intelligence-pairing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: 'Invalid body'
    });
    
    console.log(`📥 Invalid POST status: ${invalidPostResponse.status}`);
    let invalidResponseText = await invalidPostResponse.text();
    
    try {
      // Try to parse as JSON
      const invalidJson = JSON.parse(invalidResponseText);
      console.log(`✅ API returns JSON error for invalid request:`, invalidJson);
    } catch (e) {
      console.log(`❌ API returns non-JSON for invalid request:`);
      console.log(invalidResponseText.substring(0, 200) + (invalidResponseText.length > 200 ? '...' : ''));
    }
    
    // Check if the API responds to GET requests correctly
    console.log(`\n📤 Testing GET request to simple API endpoint`);
    const simpleResponse = await fetch(`${vercelUrl}/api/simple-test`);
    console.log(`📥 Simple API status: ${simpleResponse.status}`);
    console.log(`📄 Content type: ${simpleResponse.headers.get('content-type')}`);
    
    const simpleText = await simpleResponse.text();
    try {
      // Try to parse as JSON
      const simpleJson = JSON.parse(simpleText);
      console.log(`✅ Simple API returns JSON:`, simpleJson);
    } catch (e) {
      console.log(`❌ API returns non-JSON for simple request:`);
      console.log(simpleText.substring(0, 200) + (simpleText.length > 200 ? '...' : ''));
    }
    
    console.log(`\n📊 Deployment verification summary:`);
    if (
      simpleResponse.headers.get('content-type').includes('html') || 
      invalidPostResponse.headers.get('content-type').includes('html')
    ) {
      console.log(`❌ API appears to be serving HTML instead of JSON responses`);
      console.log(`🛠 Possible issues:`);
      console.log(`  1. Wrong deployment target in Vercel (should be Next.js)`)
      console.log(`  2. Missing next.config.js file or incorrect configuration`);
      console.log(`  3. API routes not included in the build`);
      console.log(`  4. Root redirect or rewrite catching all routes`)
    } else {
      console.log(`✅ API routing appears to be working correctly`);
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error(error);
  }
}

checkDeployment();