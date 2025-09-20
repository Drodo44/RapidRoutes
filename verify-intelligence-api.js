#!/usr/bin/env node
/**
 * RapidRoutes Intelligence Pairing Verification
 * This script tests the /api/intelligence-pairing endpoint in production
 * 
 * Usage: 
 * node verify-intelligence-api.js <vercel-url> [api-key]
 * 
 * Example:
 * node verify-intelligence-api.js https://rapidroutes.vercel.app your-api-key
 */

import fetch from 'node-fetch';

const [,, vercelUrl = 'http://localhost:3000', apiKey = ''] = process.argv;

async function verifyIntelligencePairing() {
  console.log(`🔍 Verifying intelligence-pairing API at ${vercelUrl}`);
  
  const testData = {
    originCity: 'Chicago',
    originState: 'IL',
    destCity: 'Atlanta',
    destState: 'GA'
  };
  
  console.log(`📤 Sending request with test data: ${JSON.stringify(testData)}`);
  
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add API key if provided
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    const response = await fetch(`${vercelUrl}/api/intelligence-pairing`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testData),
    });
    
    const result = await response.json();
    
    console.log(`📥 Response status: ${response.status}`);
    
    // Handle error response
    if (!response.ok) {
      console.error(`❌ API error (Status ${response.status}):`);
      console.error(JSON.stringify(result, null, 2));
      if (result.message) {
        console.error(`Message: ${result.message}`);
      }
      if (result.stack) {
        console.error(`Stack trace: ${result.stack}`);
      }
      if (result.error) {
        console.error(`Error: ${typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}`);
      }
      process.exit(1);
    }
    
    // Validate success response
    console.log(`✅ API call successful: ${result.success}`);
    console.log(`📊 Generated ${result.count || 0} pairs`);
    
    // Analyze pairs
    if (result.pairs && result.pairs.length > 0) {
      const uniqueKMAs = new Set();
      const validPairs = [];
      
      for (const pair of result.pairs) {
        const origin = pair.origin || {};
        const dest = pair.destination || {};
        
        // Add KMAs to set
        if (origin.kma) uniqueKMAs.add(origin.kma);
        if (dest.kma) uniqueKMAs.add(dest.kma);
        
        // Validate pair fields
        const valid = origin.city && origin.state && origin.zip && origin.kma &&
                     dest.city && dest.state && dest.zip && dest.kma;
        
        if (valid) validPairs.push(pair);
      }
      
      console.log(`✅ Found ${uniqueKMAs.size} unique KMAs (minimum 5 required)`);
      console.log(`✅ ${validPairs.length} valid pairs (${result.pairs.length} total)`);
      
      if (uniqueKMAs.size < 5) {
        console.warn(`⚠️ Warning: Less than 5 unique KMAs found`);
      }
      
      if (validPairs.length < result.pairs.length) {
        console.warn(`⚠️ Warning: ${result.pairs.length - validPairs.length} invalid pairs detected`);
      }
      
      // Print first pair as sample
      if (validPairs.length > 0) {
        console.log('\n📋 Sample pair:');
        const sample = validPairs[0];
        console.log(`Origin: ${sample.origin.city}, ${sample.origin.state} (KMA: ${sample.origin.kma})`);
        console.log(`Destination: ${sample.destination.city}, ${sample.destination.state} (KMA: ${sample.destination.kma})`);
      }
    } else {
      console.error('❌ No pairs returned from API');
      process.exit(1);
    }
    
    console.log('\n🎉 Verification complete! The intelligence-pairing endpoint is working properly.');
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

verifyIntelligencePairing();