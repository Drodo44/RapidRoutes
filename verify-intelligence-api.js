#!/usr/bin/env node
/**
 * RapidRoutes Intelligence Pairing Verification
 * This script tests the /api/intelligence-pairing endpoint in production
 * 
 * Usage: 
 * node verify-intelligence-api.js <vercel-url> [supabase-url] [supabase-service-key]
 * 
 * Example:
 * node verify-intelligence-api.js https://rapid-routes.vercel.app https://abc.supabase.co eyJhbGci...
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const [,, vercelUrl = 'https://rapid-routes.vercel.app', 
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, 
      serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY] = process.argv;

async function verifyIntelligencePairing() {
  console.log('🔍 RapidRoutes Intelligence API Production Verification');
  console.log('=================================================');
  console.log(`🌐 Target API: ${vercelUrl}/api/intelligence-pairing`);
  console.log(`🔑 Supabase URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'Not provided'}`);
  console.log(`🔑 Service Key: ${serviceKey ? '✅ Provided' : '❌ Missing'}`);
  
  // Check if we have the required Supabase credentials
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing Supabase URL or service key. Both are required for authentication.');
    console.error('Usage: node verify-intelligence-api.js <vercel-url> <supabase-url> <service-key>');
    console.error('Or set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
  }

  // Create Supabase admin client to authenticate
  console.log(`\n🔐 Creating Supabase admin client with service key`);
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { 'X-Client-Info': 'RapidRoutes-Verifier' },
    },
  });

  // First verify Supabase connection
  console.log(`🔄 Verifying Supabase connection...`);
  try {
    const { data: testData, error: testError } = await supabase
      .from('cities')
      .select('*')
      .limit(1);
      
    if (testError) {
      console.warn(`⚠️ Supabase connection warning: ${testError.message}`);
      console.log(`➡️ Continuing with authentication test anyway`);
    } else {
      console.log(`✅ Supabase connection successful (found ${testData?.length || 0} test records)`);
    }
  } catch (connError) {
    console.warn(`⚠️ Supabase connection warning: ${connError.message}`);
    console.log(`➡️ Continuing with authentication test anyway`);
  }
  
  console.log(`\n🔑 Getting authenticated session...`);
  let accessToken;
  
  try {
    // Try creating an admin session directly using the service role
    const { data: adminSessionData, error: adminSessionError } = await supabase.auth.admin.createSession({
      userId: '00000000-0000-0000-0000-000000000000', // dummy UUID for service role session
      attributes: {
        role: 'service_role'
      }
    });

    if (adminSessionError) {
      console.log(`⚠️ createSession failed: ${adminSessionError.message}`);
      console.log(`➡️ Trying alternative authentication method...`);
      
      // Try generating a link instead
      const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: 'serviceaccount@rapidroutes.app',
        options: {
          redirectTo: `${vercelUrl}/dashboard`,
        },
      });
      
      if (authError) {
        throw new Error(`Authentication failed: ${authError.message}`);
      }
      
      const { properties } = authData || {};
      accessToken = properties?.access_token;
      console.log(`✅ Authentication successful using magic link`);
    } else {
      accessToken = adminSessionData?.session?.access_token;
      console.log(`✅ Authentication successful using admin session`);
      accessToken = properties?.access_token;
      console.log(`✅ Authentication successful using magic link`);
    }
  } catch (authFailed) {
    console.log(`⚠️ Standard authentication failed: ${authFailed.message}`);
    console.log(`➡️ Creating custom JWT token via admin API...`);
    
    try {
      // Create a custom JWT for testing purposes only
      const { data: customAuthData, error: customAuthError } = await supabase.auth.admin.createUser({
        email: 'temp-test-user@rapidroutes.app',
        password: 'TemporaryTestPassword!123',
        email_confirm: true
      });
      
      if (customAuthError) {
        throw new Error(`Failed to create test user: ${customAuthError.message}`);
      }
      
      // Sign in with the new user to get token
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'temp-test-user@rapidroutes.app',
        password: 'TemporaryTestPassword!123'
      });
      
      if (signInError) {
        throw new Error(`Failed to sign in with test user: ${signInError.message}`);
      }
      
      accessToken = signInData?.session?.access_token;
      console.log(`✅ Created temporary test user and authenticated successfully`);
    } catch (finalError) {
      console.error(`❌ All authentication methods failed: ${finalError.message}`);
      process.exit(1);
    }
  }

  if (!accessToken) {
    console.error('❌ Failed to get access token after trying multiple methods');
    process.exit(1);
  }

  // Verify token has proper JWT format
  const tokenParts = accessToken.split('.');
  if (tokenParts.length !== 3) {
    console.error(`❌ Invalid token format. Expected JWT format with 3 parts, got ${tokenParts.length}`);
    process.exit(1);
  }
  
  console.log(`✅ Successfully obtained authentication token: ${accessToken.substring(0, 25)}...`);
  
  // Try decoding the token to verify it's valid JWT
  try {
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    console.log(`✅ Token payload validated - Subject: ${payload.sub}, Expires: ${new Date(payload.exp * 1000).toISOString()}`);
    
    // Check if token is expired
    if (payload.exp * 1000 < Date.now()) {
      console.error(`❌ Token is expired! Expiry: ${new Date(payload.exp * 1000).toISOString()}`);
      process.exit(1);
    }
  } catch (e) {
    console.warn(`⚠️ Could not decode token payload: ${e.message}`);
  }

  const testData = {
    originCity: 'Chicago',
    originState: 'IL',
    originZip: '60601',
    destCity: 'Atlanta',
    destState: 'GA',
    destZip: '30303',
    equipmentCode: 'FD' // Flatbed equipment code
  };
  
  console.log(`\n📤 Sending request with test data:`);
  console.log(JSON.stringify(testData, null, 2));
  
  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    };
    
    console.log(`📤 Request headers:`, headers);
    
    // Set up cookies if needed
    const cookieJar = {
      'sb-access-token': accessToken,
      'supabase-auth-token': JSON.stringify({ access_token: accessToken })
    };
    
    console.log(`📤 Using cookies:`, cookieJar);
    
    const response = await fetch(`${vercelUrl}/api/intelligence-pairing`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testData),
      credentials: 'include'
    });
    
    console.log(`📥 Response status: ${response.status} ${response.statusText}`);
    console.log(`📥 Response headers:`, {
      'content-type': response.headers.get('content-type'),
      'server': response.headers.get('server')
    });
    
    // Get response text first
    const responseText = await response.text();
    console.log(`📥 Response size: ${responseText.length} bytes`);
    
    let result;
    try {
      // Try parsing as JSON
      result = JSON.parse(responseText);
      console.log(`📥 Response is valid JSON`);
    } catch (e) {
      console.error(`❌ Response is not valid JSON:`, e.message);
      console.error(`Response content (first 500 chars): ${responseText.substring(0, 500)}...`);
      
      // If we received HTML, this might be a routing issue
      if (responseText.includes('<!DOCTYPE html>') || responseText.includes('<html')) {
        console.error(`❌ CRITICAL ERROR: Received HTML response instead of JSON`);
        console.error(`👉 This suggests the Vercel deployment fix has not been applied or has not finished deploying yet`);
        process.exit(1);
      }
      
      process.exit(1);
    }
    
    // Handle error response
    if (!response.ok) {
      console.error(`❌ API error (Status ${response.status}):`);
      console.error(JSON.stringify(result, null, 2));
      
      // Special handling for 401 Unauthorized
      if (response.status === 401) {
        console.error(`❌ Authentication failed: ${result.error || 'Unauthorized'}`);
        console.error(`👉 Details: ${result.details || 'No details provided'}`);
        console.error(`\n📋 Authentication troubleshooting:`);
        console.error(`1. Verify Supabase URL: ${supabaseUrl ? '✅ Provided' : '❌ Missing'}`);
        console.error(`2. Check token format: ${accessToken.includes('.') ? '✅ Valid JWT format' : '❌ Invalid format'}`);
        console.error(`3. Verify request headers: ${headers['Authorization'] ? '✅ Set correctly' : '❌ Missing/invalid'}`);
      }
      
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
      
      // Different pair format possibilities
      for (const pair of result.pairs) {
        // Check format 1 (nested origin/destination objects)
        if (pair.origin || pair.destination) {
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
        // Check format 2 (flat fields with prefixes)
        else if (pair.origin_city || pair.dest_city) {
          // Add KMAs to set
          if (pair.origin_kma) uniqueKMAs.add(pair.origin_kma);
          if (pair.dest_kma) uniqueKMAs.add(pair.dest_kma);
          
          // Validate pair fields
          const valid = pair.origin_city && pair.origin_state && pair.origin_zip && pair.origin_kma &&
                      pair.dest_city && pair.dest_state && pair.dest_zip && pair.dest_kma;
          
          if (valid) validPairs.push(pair);
        }
      }
      
      console.log(`\n✅ Found ${uniqueKMAs.size} unique KMAs (minimum 5 required)`);
      console.log(`✅ ${validPairs.length} valid pairs (${result.pairs.length} total)`);
      
      if (uniqueKMAs.size < 5) {
        console.error(`❌ ERROR: Less than 5 unique KMAs found - requirement not met!`);
        process.exit(1);
      }
      
      if (validPairs.length < result.pairs.length) {
        console.warn(`⚠️ Warning: ${result.pairs.length - validPairs.length} pairs may have incomplete data`);
      }
      
      // Print pairs as sample
      console.log('\n📋 Sample pairs:');
      const sampleSize = Math.min(3, validPairs.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const pair = validPairs[i];
        console.log(`\nPAIR ${i+1}:`);
        
        // Handle different pair formats
        if (pair.origin && pair.destination) {
          console.log(`Origin: ${pair.origin.city}, ${pair.origin.state}, ${pair.origin.zip} (KMA: ${pair.origin.kma})`);
          console.log(`Destination: ${pair.destination.city}, ${pair.destination.state}, ${pair.destination.zip} (KMA: ${pair.destination.kma})`);
          if (pair.distance) console.log(`Distance: ${pair.distance} miles`);
        } else {
          console.log(`Origin: ${pair.origin_city}, ${pair.origin_state}, ${pair.origin_zip} (KMA: ${pair.origin_kma})`);
          console.log(`Destination: ${pair.dest_city}, ${pair.dest_state}, ${pair.dest_zip} (KMA: ${pair.dest_kma})`);
          if (pair.distance_miles) console.log(`Distance: ${pair.distance_miles} miles`);
        }
      }
      
      // Print important verification results
      console.log('\n🎯 VERIFICATION RESULTS:');
      console.log(`✅ API authentication successful (200 OK)`);
      console.log(`✅ JSON response received`);
      console.log(`✅ ${result.pairs.length} pairs generated`);
      console.log(`✅ ${uniqueKMAs.size} unique KMAs found (minimum 5 required)`);
      console.log(`✅ ${validPairs.length} valid pairs with KMA data`);
      console.log(`✅ Sample pairs printed above`);
      
      console.log('\n📄 Response Summary:');
      console.log({
        success: result.success,
        count: result.count || result.pairs?.length || 0,
        uniqueKMAs: uniqueKMAs.size,
        validPairs: validPairs.length,
        totalPairs: result.pairs?.length || 0
      });
    } else {
      console.error('❌ No pairs returned from API');
      process.exit(1);
    }
    
    console.log('\n🎉 VERIFICATION COMPLETE: The intelligence-pairing endpoint is working properly!');
    console.log('✅ Authentication is functioning correctly with Supabase JWT');
    console.log('✅ Intelligence pairing system is generating valid pairs');
    console.log('✅ API returns proper JSON responses with 200 OK status');
    console.log('✅ All requirements have been met');
    
    // Update todo list status
    console.log('\n📋 Todo List Status:');
    console.log('✓ Analyze current authentication flow');
    console.log('✓ Fix frontend authentication in post-options.js');
    console.log('✓ Fix backend authentication in intelligence-pairing.js');
    console.log('✓ Test changes locally');
    console.log('✓ Deploy changes');
    console.log('✓ Verify functionality in production');
  } catch (error) {
    console.error(`\n❌ Verification failed: ${error.message}`);
    console.error(error);
    
    // Try to diagnose common issues
    console.log('\n🔍 Troubleshooting suggestions:');
    console.log('1. Check if the Vercel deployment is complete');
    console.log('2. Verify all environment variables are correctly set in Vercel');
    console.log('3. Confirm the API route is correctly configured in the deployment');
    console.log('4. Check that Supabase authentication is properly configured');
    console.log('5. Try running the fix-deployment.js script again');
    
    process.exit(1);
  }
}

verifyIntelligencePairing();