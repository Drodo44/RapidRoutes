#!/usr/bin/env node
/**
 * RapidRoutes Intelligence Pairing Verification
 * This script tests the /api/intelligence-pairing endpoint in production
 * 
 * Usage: 
 * node verify-intelligence-api.js <vercel-url> [supabase-url] [supabase-service-key]
 * 
 * Example:
 * node verify-intelligence-api.js https://rapidroutes.vercel.app https://abc.supabase.co eyJhbGci...
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const [,, vercelUrl = 'http://localhost:3000', supabaseUrl, serviceKey] = process.argv;

async function verifyIntelligencePairing() {
  console.log(`🔍 Verifying intelligence-pairing API at ${vercelUrl}`);
  
  // Check if we have the required Supabase credentials
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase URL or service key. Both are required for authentication.');
    console.error('Usage: node verify-intelligence-api.js <vercel-url> <supabase-url> <service-key>');
    process.exit(1);
  }

  // Create Supabase admin client to authenticate
  console.log(`🔐 Creating Supabase admin client with service key`);
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log(`🔑 Getting authenticated session...`);
  const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: 'serviceaccount@rapidroutes.app',
    options: {
      redirectTo: `${vercelUrl}/dashboard`,
    },
  });

  if (authError) {
    console.error('❌ Authentication failed:', authError.message);
    process.exit(1);
  }

  const { properties } = authData;
  const accessToken = properties?.access_token;

  if (!accessToken) {
    console.error('❌ Failed to get access token');
    process.exit(1);
  }

  console.log(`✅ Successfully obtained authentication token`);

  const testData = {
    originCity: 'Chicago',
    originState: 'IL',
    originZip: '60601',
    destCity: 'Atlanta',
    destState: 'GA',
    destZip: '30303',
    equipmentCode: 'FD'
  };
  
  console.log(`📤 Sending request with test data: ${JSON.stringify(testData)}`);
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };
    
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
      
      // Print pairs as sample
      console.log('\n📋 Sample pairs:');
      const sampleSize = Math.min(3, validPairs.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const pair = validPairs[i];
        console.log(`\nPAIR ${i+1}:`);
        console.log(`Origin: ${pair.origin.city}, ${pair.origin.state}, ${pair.origin.zip} (KMA: ${pair.origin.kma})`);
        console.log(`Destination: ${pair.destination.city}, ${pair.destination.state}, ${pair.destination.zip} (KMA: ${pair.destination.kma})`);
        if (pair.distance) console.log(`Distance: ${pair.distance} miles`);
      }
      
      // Print full JSON response in a formatted way
      console.log('\n📄 Full Response JSON:');
      console.log(JSON.stringify(result, null, 2));
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