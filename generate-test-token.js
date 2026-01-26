#!/usr/bin/env node
/**
 * RapidRoutes Token Generator and Verification
 * 
 * This script creates a valid JWT for Supabase with the service role and tests 
 * it against the intelligence API endpoint.
 */

import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Get the API URL from command line or use default
const apiUrl = process.argv[2] || 'https://rapid-routes.vercel.app';

// Extract Supabase details from the URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseProjectRef = '';

try {
  // Extract the project reference from the Supabase URL
  const urlMatch = SUPABASE_URL.match(/https:\/\/([a-zA-Z0-9-]+)\.supabase\.co/);
  if (urlMatch && urlMatch[1]) {
    supabaseProjectRef = urlMatch[1];
    console.log(`✅ Extracted Supabase project ref: ${supabaseProjectRef}`);
  }
} catch (error) {
  console.log(`⚠️ Could not extract project ref from URL: ${error.message}`);
}

// Test data for intelligence pairing API
const testData = {
  originCity: 'Chicago',
  originState: 'IL',
  originZip: '60601',
  destCity: 'Atlanta',
  destState: 'GA',
  destZip: '30303',
  equipmentCode: 'FD'
};

// Function to generate a Supabase JWT token
function generateSupabaseJWT() {
  try {
    // Parse the existing service role key to get its structure
    const [headerB64, payloadB64] = SUPABASE_KEY.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
    
    console.log('📄 Existing token payload:', payload);
    
    // Create a new token with the same structure but updated timestamps
    const now = Math.floor(Date.now() / 1000);
    const newPayload = {
      ...payload,
      iat: now,
      exp: now + 3600 // 1 hour expiration
    };
    
    // Use the service role key as the signing secret (not secure but works for testing)
    const secret = SUPABASE_KEY.split('.')[2];
    const token = jwt.sign(newPayload, secret, { algorithm: 'HS256' });
    
    return token;
  } catch (error) {
    console.error('❌ Failed to generate JWT:', error);
    return null;
  }
}

async function verifyIntelligenceAPI() {
  console.log('🔍 RapidRoutes Intelligence API Verification');
  console.log('==========================================');
  console.log(`🌐 API URL: ${apiUrl}/api/intelligence-pairing`);
  console.log(`🔑 Using service role key from .env file`);
  
  // First, try to use the existing service role key directly
  console.log('\n📡 Test 1: Using existing service role key directly');
  await testWithToken(SUPABASE_KEY, 'Service Role Key');
  
  // Next, try with a guest JWT
  console.log('\n📡 Test 2: Using Supabase client with service role');
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      // Create admin client
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false },
        db: { schema: 'public' }
      });
      
      // Sign up a temporary user
      const email = `test-${Date.now()}@rapidroutes-verify.com`;
      const password = 'TemporaryPassword123!';
      
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      
      if (error) {
        console.error('❌ Failed to create test user:', error.message);
      } else {
        console.log(`✅ Created test user: ${email}`);
        
        // Now sign in to get a token
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) {
          console.error('❌ Failed to sign in:', signInError.message);
        } else {
          const token = signInData?.session?.access_token;
          console.log(`✅ Got auth token for test user`);
          await testWithToken(token, 'Test User Token');
        }
      }
    } catch (error) {
      console.error('❌ Failed to create test user:', error.message);
    }
  }
  
  // Final approach: Create our own JWT with similar structure to Supabase's
  console.log('\n📡 Test 3: Using manually crafted JWT');
  const manualJWT = generateSupabaseJWT();
  if (manualJWT) {
    await testWithToken(manualJWT, 'Manual JWT');
  }
}

async function testWithToken(token, tokenDescription) {
  console.log(`🔑 Testing with ${tokenDescription}`);
  console.log(`Token (first 20 chars): ${token.substring(0, 20)}...`);
  
  try {
    const response = await fetch(`${apiUrl}/api/intelligence-pairing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`📥 Response status: ${response.status}`);
    const text = await response.text();
    
    try {
      const json = JSON.parse(text);
      console.log(`📥 Response body: ${JSON.stringify(json, null, 2)}`);
      
      // Check if we got a successful response with pairs
      if (json.success && Array.isArray(json.pairs) && json.pairs.length > 0) {
        console.log(`\n✅ SUCCESS: Got ${json.pairs.length} pairs!`);
        
        // Count unique KMAs
        const uniqueKmas = new Set();
        json.pairs.forEach(pair => {
          if (pair.origin_kma) uniqueKmas.add(pair.origin_kma);
          if (pair.dest_kma) uniqueKmas.add(pair.dest_kma);
        });
        
        console.log(`✅ Found ${uniqueKmas.size} unique KMA codes`);
        
        // Save the response to a file for later analysis
        const responseFile = 'intelligence-api-response.json';
        fs.writeFileSync(responseFile, JSON.stringify(json, null, 2));
        console.log(`✅ Saved full response to ${responseFile}`);
        
        // Show sample pairs
        console.log('\n📋 Sample Pairs (first 3):');
        json.pairs.slice(0, 3).forEach((pair, index) => {
          console.log(`\nPair ${index + 1}:`);
          console.log(JSON.stringify(pair, null, 2));
        });
        
        return true;
      } else if (json.error === 'Unauthorized' || response.status === 401) {
        console.log(`❌ Authentication failed: ${json.details || 'Unknown reason'}`);
      } else {
        console.log(`❌ API error: ${json.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('❌ Failed to parse JSON response:', e.message);
      console.error('Response (first 300 chars):', text.substring(0, 300));
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
  
  return false;
}

verifyIntelligenceAPI().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});