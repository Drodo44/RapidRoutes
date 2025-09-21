#!/usr/bin/env node
/**
 * RapidRoutes Intelligence API Verification Script
 * 
 * A production verification tool for testing the intelligence-pairing API
 * in production environments using server-side environment variables.
 * 
 * This script:
 * 1. Authenticates with Supabase using service role key
 * 2. Makes a request to the intelligence-pairing API
 * 3. Verifies the response contains at least 5 unique KMAs
 * 4. Provides clear feedback
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

// Configuration - Use environment variables from Vercel
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// API URLs - Always use production URL to verify deployed endpoint
const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';

// Test lane data
const testLane = {
  originCity: 'Chicago',
  originState: 'IL',
  originZip: '60601',
  destCity: 'Atlanta', 
  destState: 'GA',
  destZip: '30303',
  equipmentCode: 'FD'
};

// Required minimum unique KMAs
const MIN_UNIQUE_KMAS = 5;

/**
 * Helper function to count unique KMA codes in response
 */
function countUniqueKmas(pairs) {
  if (!pairs || !Array.isArray(pairs)) return 0;
  
  const allKmas = new Set();
  
  pairs.forEach(pair => {
    // Handle both snake_case and camelCase formats
    const originKma = pair.origin_kma || pair.originKma;
    const destKma = pair.dest_kma || pair.destKma;
    
    if (originKma) allKmas.add(originKma);
    if (destKma) allKmas.add(destKma);
  });
  
  return {
    uniqueCount: allKmas.size,
    kmas: Array.from(allKmas)
  };
}

/**
 * Authenticate with Supabase using service role key
 */
async function authenticate() {
  console.log(chalk.blue('🔑 Authenticating with Supabase using service role...'));
  
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.log(chalk.red('❌ Error: Required environment variables missing'));
    console.log(chalk.yellow('Please ensure these environment variables are set:'));
    console.log(chalk.yellow('- NEXT_PUBLIC_SUPABASE_URL'));
    console.log(chalk.yellow('- SUPABASE_SERVICE_ROLE_KEY'));
    return null;
  }
  
  try {
    // Create admin client with service role key
    const adminSupabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    // Create a test user or use admin token directly
    const testEmail = `test-user-${Date.now()}@rapidroutes-verify.com`;
    const testPassword = `Test${Date.now()}!`;
    
    // Create test user and sign them in to get a valid token
    if (error) {
      console.log(chalk.red(`❌ User creation failed: ${error.message}`));
      console.log(chalk.yellow('Using service role token directly for authentication...'));
      
      // Generate a JWT token using the service role for direct API access
      const { data: tokenData, error: tokenError } = await adminSupabase.auth.admin.generateLink({
        type: 'magiclink',
        email: 'admin@rapidroutes.vercel.app',
      });
      
      if (tokenError) {
        console.log(chalk.red(`❌ Token generation failed: ${tokenError.message}`));
        return null;
      }
      
      console.log(chalk.green('✅ Generated admin token successfully!'));
      return tokenData.properties.access_token;
    }
    
    // If user creation succeeded, get their token
    const userId = data.user.id;
    console.log(chalk.green(`✅ Created test user: ${userId}`));
    
    // Sign in the user to get their token
    const { data: signInData, error: signInError } = await adminSupabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.log(chalk.red(`❌ Sign-in failed: ${signInError.message}`));
      return null;
    }
    
    const token = signInData.session.access_token;
    console.log(chalk.green('✅ Authentication successful!'));
    return token;
  } catch (err) {
    console.log(chalk.red(`❌ Error during authentication: ${err.message}`));
    return null;
  }
}

/**
 * Call the intelligence-pairing API
 */
async function callApi(token) {
  console.log(chalk.blue(`\n🌐 Calling API: ${API_URL}`));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testLane)
    });
    
    if (!response.ok) {
      const text = await response.text();
      console.log(chalk.red(`❌ API call failed with status ${response.status}`));
      console.log(chalk.red(`Error: ${text}`));
      return { success: false };
    }
    
    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.log(chalk.red(`❌ Error calling API: ${error.message}`));
    return { success: false };
  }
}

/**
 * Verify API response
 */
function verifyResponse(data) {
  console.log(chalk.blue('\n🔍 Verifying response...'));
  
  if (!data.pairs || !Array.isArray(data.pairs)) {
    console.log(chalk.red('❌ Response does not contain a pairs array'));
    return false;
  }
  
  console.log(chalk.green(`✅ Found ${data.pairs.length} pairs in response`));
  
  const kmaCount = countUniqueKmas(data.pairs);
  
  console.log(`Total unique KMAs: ${kmaCount.uniqueCount}`);
  console.log(`KMA codes: ${kmaCount.kmas.join(', ')}`);
  
  if (kmaCount.uniqueCount >= MIN_UNIQUE_KMAS) {
    console.log(chalk.green(`✅ REQUIREMENT MET: ${kmaCount.uniqueCount} unique KMAs (minimum ${MIN_UNIQUE_KMAS})`));
    return true;
  } else {
    console.log(chalk.red(`❌ REQUIREMENT NOT MET: Only ${kmaCount.uniqueCount} unique KMAs (minimum ${MIN_UNIQUE_KMAS} required)`));
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(chalk.bold('\n🚚 RapidRoutes Intelligence API Verification\n'));
  
  // Step 1: Authenticate
  const token = await authenticate();
  if (!token) {
    process.exit(1);
  }
  
  // Step 2: Call API
  const { success, data } = await callApi(token);
  if (!success) {
    process.exit(1);
  }
  
  // Step 3: Verify response
  const isValid = verifyResponse(data);
  
  if (isValid) {
    console.log(chalk.green.bold('\n🎉 VERIFICATION SUCCESSFUL! 🎉'));
    console.log(chalk.green('The intelligence-pairing API is working correctly!'));
  } else {
    console.log(chalk.red.bold('\n❌ VERIFICATION FAILED'));
    console.log(chalk.red('The API response does not meet requirements.'));
    process.exit(1);
  }
}

// Run the script
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});