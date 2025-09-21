#!/usr/bin/env node
/**
 * RapidRoutes Intelligence API JWT Verification
 * 
 * This script simulates a token and sends it to the intelligence API endpoint
 * for verification. This helps us check if the API routes are properly deployed
 * without requiring a full Supabase connection.
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get API URL from command line or use default
const apiUrl = process.argv[2] || 'https://rapid-routes.vercel.app';

// Use the service key from the .env file if available
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// If we have the service role key, use it directly as a bearer token
const token = serviceRoleKey || 
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5d3ZtaGR5eWhrZHBtYmZ6a2d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4OTQ1NTcxNiwiZXhwIjoyMDA1MDMxNzE2fQ.VeYGv5ZdCTKRJrAsyRJ8YOScte4ayZTTuXVA65gs9RA";

// Test payload
const testData = {
  originCity: 'Chicago',
  originState: 'IL',
  originZip: '60601',
  destCity: 'Atlanta',
  destState: 'GA',
  destZip: '30303',
  equipmentCode: 'FD'
};

async function verifyWithToken() {
  console.log('🔍 RapidRoutes Intelligence API JWT Verification');
  console.log('=============================================');
  console.log(`🌐 Target API: ${apiUrl}/api/intelligence-pairing`);
  console.log(`🔑 Using JWT token: ${token.substring(0, 20)}...`);
  console.log(`📦 Test payload: ${JSON.stringify(testData)}`);
  
  try {
    console.log('\n📤 Sending request with authentication token');
    const response = await fetch(`${apiUrl}/api/intelligence-pairing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`📥 Response status: ${response.status}`);
    console.log(`📥 Content-Type: ${response.headers.get('content-type')}`);
    
    // Get the response text
    const text = await response.text();
    
    try {
      // Try parsing as JSON
      const result = JSON.parse(text);
      console.log(`📥 Response is valid JSON`);
      
      if (result.success && Array.isArray(result.pairs)) {
        console.log(`\n✅ SUCCESS! API returned ${result.pairs.length} pairs`);
        
        // Count unique KMA codes
        const uniqueKmas = new Set();
        result.pairs.forEach(pair => {
          if (pair.origin_kma) uniqueKmas.add(pair.origin_kma);
          if (pair.dest_kma) uniqueKmas.add(pair.dest_kma);
        });
        
        console.log(`✅ Found ${uniqueKmas.size} unique KMA codes`);
        console.log(`✅ Sample KMA codes: ${[...uniqueKmas].slice(0, 5).join(', ')}`);
        
        // Show sample pairs
        console.log('\n📋 Sample pairs (first 3):');
        result.pairs.slice(0, 3).forEach((pair, index) => {
          console.log(`\nPair ${index + 1}:`);
          console.log(JSON.stringify(pair, null, 2));
        });
        
        return true;
      } else {
        console.error(`❌ API returned error:`);
        console.error(JSON.stringify(result, null, 2));
        
        // Special handling for token validation errors
        if (response.status === 401 && result.error === 'Unauthorized') {
          console.log('\n🔍 Authentication troubleshooting:');
          console.log('1. The service role key may be invalid or expired');
          console.log('2. The API may not be recognizing the token format');
          console.log('3. The Supabase project ID in the JWT may not match the production environment');
        }
        
        return false;
      }
    } catch (e) {
      console.error(`❌ Response is not valid JSON:`, e.message);
      console.error(`Response (first 500 chars): ${text.substring(0, 500)}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    return false;
  }
}

verifyWithToken().then(success => {
  process.exit(success ? 0 : 1);
});