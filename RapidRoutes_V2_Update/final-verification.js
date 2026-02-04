#!/usr/bin/env node
/**
 * RapidRoutes Final Production Verification
 * 
 * This script:
 * 1. Authenticates with Supabase to get a valid JWT token
 * 2. Calls the intelligence-pairing API with proper authentication
 * 3. Verifies the response contains valid lane pairs
 */

import 'dotenv/config';
import fetch from 'node-fetch';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_URL = 'https://rapid-routes.vercel.app';

// Test payload
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
 * Print section header
 */
function printHeader(title) {
  console.log('\n' + '='.repeat(title.length + 4));
  console.log(`= ${title} =`);
  console.log('='.repeat(title.length + 4));
}

/**
 * Create a Supabase client
 */
function createSupabaseClient(key) {
  return createClient(SUPABASE_URL, key, {
    auth: { 
      persistSession: false,
      detectSessionInUrl: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Extract JWT token from service role key
 * This approach uses the service key directly as a JWT token
 */
async function extractJwtFromServiceKey() {
  printHeader("EXTRACTING JWT FROM SERVICE KEY");
  
  if (!SUPABASE_SERVICE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in environment");
  }
  
  console.log(`Service key (first 20 chars): ${SUPABASE_SERVICE_KEY.substring(0, 20)}...`);
  
  // Parse the JWT to display its payload
  try {
    const parts = SUPABASE_SERVICE_KEY.split('.');
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log("\nDecoded JWT payload:");
    console.log(JSON.stringify({
      iss: payload.iss,
      role: payload.role,
      exp: new Date(payload.exp * 1000).toISOString(),
      ref: payload.ref
    }, null, 2));
    
    return SUPABASE_SERVICE_KEY;
  } catch (error) {
    console.error(`Failed to parse JWT: ${error.message}`);
    return SUPABASE_SERVICE_KEY; // Return it anyway, might still work
  }
}

/**
 * Sign in with email/password
 */
async function signInWithEmailPassword() {
  printHeader("SIGNING IN WITH EMAIL/PASSWORD");
  
  try {
    const supabase = createSupabaseClient(SUPABASE_ANON_KEY);
    
    // Test credentials - these should be real credentials for the verification
    const email = 'test@rapidroutes.com';
    const password = 'TestPassword123!';
    
    console.log(`Attempting to sign in as: ${email}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      throw error;
    }
    
    console.log("✅ Sign in successful!");
    console.log(`Access token (first 20 chars): ${data.session.access_token.substring(0, 20)}...`);
    
    return data.session.access_token;
  } catch (error) {
    console.error(`❌ Sign in failed: ${error.message}`);
    throw error;
  }
}

/**
 * Try all authentication methods until one works
 */
async function getAuthToken() {
  printHeader("AUTHENTICATION");
  
  const methods = [
    { name: "Email/Password", fn: signInWithEmailPassword },
    { name: "Service Key JWT", fn: extractJwtFromServiceKey }
  ];
  
  for (const method of methods) {
    try {
      console.log(`\nTrying authentication method: ${method.name}`);
      const token = await method.fn();
      console.log(`✅ Authentication successful using ${method.name}`);
      return token;
    } catch (error) {
      console.log(`❌ Method failed: ${error.message}`);
    }
  }
  
  throw new Error("All authentication methods failed");
}

/**
 * Call the intelligence-pairing API with the given token
 */
async function callApi(token) {
  printHeader("API REQUEST");
  
  console.log("Endpoint:", `${API_URL}/api/intelligence-pairing`);
  console.log("Request payload:");
  console.log(JSON.stringify(testPayload, null, 2));
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  console.log("\nRequest headers:");
  console.log(JSON.stringify({
    'Content-Type': headers['Content-Type'],
    'Authorization': `Bearer ${token.substring(0, 20)}...`
  }, null, 2));
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${API_URL}/api/intelligence-pairing`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testPayload)
    });
    const elapsed = Date.now() - startTime;
    
    console.log(`\nResponse received in ${elapsed}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    
    // Save raw response
    const rawFilename = "final-verification-response.txt";
    fs.writeFileSync(rawFilename, responseText);
    console.log(`Raw response saved to ${rawFilename}`);
    
    try {
      const result = JSON.parse(responseText);
      
      // Save formatted JSON
      const jsonFilename = "final-verification-response.json";
      fs.writeFileSync(jsonFilename, JSON.stringify(result, null, 2));
      console.log(`Formatted response saved to ${jsonFilename}`);
      
      return { status: response.status, result };
    } catch (e) {
      console.error(`❌ Failed to parse response as JSON: ${e.message}`);
      console.error("First 500 chars of response:", responseText.substring(0, 500));
      return { status: response.status, error: "Invalid JSON", text: responseText };
    }
  } catch (error) {
    console.error(`❌ API request failed: ${error.message}`);
    return { status: 0, error: error.message };
  }
}

/**
 * Analyze API response for KMA counts and pair structure
 */
function analyzeResponse(response) {
  printHeader("RESPONSE ANALYSIS");
  
  if (response.status !== 200) {
    console.error(`❌ API returned non-200 status: ${response.status}`);
    console.error("Error details:", response.result || response.error || "Unknown error");
    return false;
  }
  
  const result = response.result;
  
  if (!result.success) {
    console.error("❌ API reported failure:", result.error || "Unknown error");
    return false;
  }
  
  if (!Array.isArray(result.pairs) || result.pairs.length === 0) {
    console.error("❌ No lane pairs returned");
    return false;
  }
  
  // Count pairs and unique KMAs
  const pairCount = result.pairs.length;
  const uniqueOriginKMAs = new Set();
  const uniqueDestKMAs = new Set();
  const uniqueAllKMAs = new Set();
  
  result.pairs.forEach(pair => {
    if (pair.origin_kma) {
      uniqueOriginKMAs.add(pair.origin_kma);
      uniqueAllKMAs.add(pair.origin_kma);
    }
    if (pair.dest_kma) {
      uniqueDestKMAs.add(pair.dest_kma);
      uniqueAllKMAs.add(pair.dest_kma);
    }
  });
  
  console.log("✅ SUCCESS! Lane generation works in production!");
  console.log(`Total pairs generated: ${pairCount}`);
  console.log(`Unique origin KMAs: ${uniqueOriginKMAs.size}`);
  console.log(`Unique destination KMAs: ${uniqueDestKMAs.size}`);
  console.log(`Total unique KMAs: ${uniqueAllKMAs.size}`);
  
  if (uniqueAllKMAs.size >= 5) {
    console.log("✅ REQUIREMENT MET: ≥5 unique KMAs found");
  } else {
    console.log("⚠️ WARNING: Less than 5 unique KMAs found");
  }
  
  // Display sample pairs
  console.log("\nSample pairs (first 3):");
  result.pairs.slice(0, 3).forEach((pair, index) => {
    console.log(`\nPair ${index + 1}:`);
    console.log(`Origin: ${pair.origin_city}, ${pair.origin_state} ${pair.origin_zip} (KMA: ${pair.origin_kma})`);
    console.log(`Destination: ${pair.dest_city}, ${pair.dest_state} ${pair.dest_zip} (KMA: ${pair.dest_kma})`);
    console.log(`Distance: ${pair.distance_miles} miles`);
  });
  
  return uniqueAllKMAs.size >= 5;
}

/**
 * Main verification function
 */
async function verifyProduction() {
  console.log("🔍 RapidRoutes Final Production Verification");
  console.log("=========================================");
  
  try {
    // Get authentication token
    const token = await getAuthToken();
    
    // Call the API
    const response = await callApi(token);
    
    // Analyze the response
    const success = analyzeResponse(response);
    
    if (success) {
      console.log("\n🎉 VERIFICATION SUCCESSFUL! Lane generation works in production with authentication!");
      return true;
    } else {
      console.error("\n❌ Verification failed. See details above.");
      return false;
    }
  } catch (error) {
    console.error(`\n❌ Verification failed: ${error.message}`);
    return false;
  }
}

// Run the verification
verifyProduction()
  .then(success => {
    console.log(success ? "\n✅ All tests passed!" : "\n❌ Tests failed!");
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error(`Fatal error: ${error}`);
    process.exit(1);
  });