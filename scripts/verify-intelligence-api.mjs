#!/usr/bin/env node
/**
 * RapidRoutes Intelligence API Verification Script
 * 
 * A simplified verification tool for testing the intelligence-pairing API
 * in development environments.
 * 
 * This script:
 * 1. Authenticates with Supabase
 * 2. Makes a request to the intelligence-pairing API
 * 3. Verifies the response contains at least 5 unique KMAs
 * 4. Provides clear feedback
 */

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import chalk from 'chalk';

// Configuration - Use production Supabase URL and key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lbcydtbyqxorycrhehao.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiY3lkdGJ5cXhvcnljcmhlaGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc0MzA2NjksImV4cCI6MjAzMzAwNjY2OX0.JIliP9R_YO2nM9UFkXzLrEmZvVsN5dfukwb0axP4sWQ';
const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;

// API URLs
const API_URL = process.env.API_URL || 'http://localhost:3000/api/intelligence-pairing';

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
 * Authenticate with Supabase
 */
async function authenticate() {
  console.log(chalk.blue('🔑 Authenticating with Supabase...'));
  
  if (!EMAIL || !PASSWORD) {
    console.log(chalk.red('❌ Error: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required'));
    console.log(chalk.yellow('Please set these environment variables before running:'));
    console.log(chalk.yellow('export TEST_USER_EMAIL=your@email.com TEST_USER_PASSWORD=yourpassword'));
    return null;
  }
  
  try {
    const supabase = createClient(SUPABASE_URL, ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD
    });
    
    if (error) {
      console.log(chalk.red(`❌ Authentication failed: ${error.message}`));
      return null;
    }
    
    const session = data.session;
    if (!session?.access_token) {
      console.log(chalk.red('❌ No access token in session'));
      return null;
    }
    
    console.log(chalk.green('✅ Authentication successful!'));
    return session.access_token;
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