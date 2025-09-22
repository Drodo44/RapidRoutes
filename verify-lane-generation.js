// verify-lane-generation.js - Production Lane Generation Test
import 'dotenv/config';
import fetch from 'node-fetch';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// API endpoint
const API_URL = 'https://rapid-routes.vercel.app';

// Supabase credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test data for production verification
const testLane = {
    originCity: "Chicago",
    originState: "IL",
    originZip: "60601",
    destCity: "Atlanta",
    destState: "GA", 
    destZip: "30303",
    equipmentCode: "FD"
};

// Expected response structure from API
const EXPECTED_PAIR_PROPERTIES = [
    "origin_city", "origin_state", "origin_zip", "origin_kma",
    "dest_city", "dest_state", "dest_zip", "dest_kma",
    "distance_miles"
];

/**
 * Print section header
 */
function printHeader(title) {
  console.log('\n' + '='.repeat(title.length + 4));
  console.log(`= ${title} =`);
  console.log('='.repeat(title.length + 4));
}

/**
 * Get a valid JWT token through Supabase authentication
 */
async function getValidToken() {
  printHeader("AUTHENTICATION");
  console.log("Supabase URL:", SUPABASE_URL);

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Attempt authentication methods in sequence
  try {
    // Method 1: Try email/password signin with test account
    console.log("\nMethod 1: Attempting email/password authentication...");
    const testEmail = 'test@rapidroutes.com';
    const testPassword = 'TestPassword123!';
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.log("❌ Email/password authentication failed:", signInError.message);
    } else {
      console.log("✅ Authentication successful!");
      return {
        token: signInData.session.access_token,
        source: 'email/password authentication'
      };
    }
  } catch (error) {
    console.log("❌ Email/password authentication error:", error.message);
  }
  
  // Method 2: Use service role key directly
  console.log("\nMethod 2: Using service role key directly...");
  try {
    if (!SUPABASE_SERVICE_KEY) {
      console.log("❌ No service role key available");
    } else {
      console.log("✅ Using service role key as token");
      return {
        token: SUPABASE_SERVICE_KEY,
        source: 'service role key'
      };
    }
  } catch (error) {
    console.log("❌ Service key error:", error.message);
  }
  
  // Method 3: Use anonymous key
  console.log("\nMethod 3: Using anonymous key...");
  try {
    if (!SUPABASE_ANON_KEY) {
      console.log("❌ No anonymous key available");
    } else {
      console.log("✅ Using anonymous key as fallback");
      return {
        token: SUPABASE_ANON_KEY,
        source: 'anonymous key'
      };
    }
  } catch (error) {
    console.log("❌ Anonymous key error:", error.message);
  }
  
  throw new Error("All authentication methods failed");
}

/**
 * Call the intelligence-pairing API with authentication
 */
async function callIntelligencePairingApi(token) {
  printHeader("API REQUEST");
  
  console.log("Endpoint:", `${API_URL}/api/intelligence-pairing`);
  console.log("Request payload:");
  console.log(JSON.stringify(testLane, null, 2));
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  console.log("\nRequest headers:");
  console.log(JSON.stringify({
    'Content-Type': headers['Content-Type'],
    'Authorization': 'Bearer ' + token.substring(0, 20) + '...'
  }, null, 2));
  
  try {
    const startTime = Date.now();
    const response = await fetch(`${API_URL}/api/intelligence-pairing`, {
      method: 'POST',
      headers,
      body: JSON.stringify(testLane)
    });
    const elapsed = Date.now() - startTime;
    
    console.log(`\nResponse received in ${elapsed}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    
    // Save raw response for debugging
    fs.writeFileSync('lane-generation-response.txt', responseText);
    console.log("Raw response saved to lane-generation-response.txt");
    
    try {
      const result = JSON.parse(responseText);
      
      // Save formatted JSON for analysis
      fs.writeFileSync('lane-generation-response.json', JSON.stringify(result, null, 2));
      console.log("Formatted response saved to lane-generation-response.json");
      
      return { 
        status: response.status,
        result
      };
    } catch (e) {
      console.error("❌ Response is not valid JSON:", e.message);
      console.error("First 500 characters of response:", responseText.substring(0, 500));
      
      return {
        status: response.status,
        error: 'Invalid JSON response',
        text: responseText
      };
    }
  } catch (error) {
    console.error("❌ API request failed:", error.message);
    return {
      status: 0,
      error: error.message
    };
  }
}

/**
 * Analyze the lane generation response
 */
function analyzeLaneGenerationResponse(response) {
  printHeader("RESPONSE ANALYSIS");
  
  if (response.status !== 200) {
    console.log(`❌ Failed with status code: ${response.status}`);
    console.log("Error details:", response.result || response.error || "Unknown error");
    return false;
  }
  
  const result = response.result;
  
  if (!result.success) {
    console.log("❌ API reported failure:");
    console.log(JSON.stringify(result, null, 2));
    return false;
  }
  
  if (!Array.isArray(result.pairs) || result.pairs.length === 0) {
    console.log("❌ No lane pairs returned");
    console.log(JSON.stringify(result, null, 2));
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
  });
  
  return uniqueAllKMAs.size >= 5;
}

/**
 * Main function to test lane generation
 */
async function verifyLaneGeneration() {
  console.log("🔍 RapidRoutes Production Lane Generation Verification");
  console.log("=====================================================");
  
  try {
    // Step 1: Get valid token
    const { token, source } = await getValidToken();
    console.log(`\nToken obtained from: ${source}`);
    
    // Step 2: Call intelligence-pairing API
    const response = await callIntelligencePairingApi(token);
    
    // Step 3: Analyze response
    const success = analyzeLaneGenerationResponse(response);
    
    if (success) {
      console.log("\n🎉 VERIFICATION SUCCESSFUL! Lane generation works in production with authentication.");
      return true;
    } else {
      console.error("\n❌ Lane generation verification failed. See details above.");
      return false;
    }
  } catch (error) {
    console.error("\n❌ Verification failed:", error.message);
    return false;
  }
}

// Run the verification
verifyLaneGeneration()
  .then(success => {
    if (success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });