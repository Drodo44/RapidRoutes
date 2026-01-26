// comprehensive-api-test.js
// Tests both the deployed API and direct Supabase function

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// API URLs
const DEPLOYED_API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gwuhjxomavulwduhvgvi.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test data
const TEST_LANE = {
  origin_city: 'Cincinnati',
  origin_state: 'OH',
  origin_zip: '45201',
  dest_city: 'Chicago',
  dest_state: 'IL',
  dest_zip: '60601',
  equipment_code: 'V',
  weight_lbs: 40000,
  length_ft: 53,
  pickup_earliest: new Date().toISOString().split('T')[0], // Today's date
  pickup_latest: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow's date
  lane_id: 'test-verification-lane'
};

// Coordinates for Cincinnati, OH
const CINCINNATI_COORDS = {
  lat: 39.1031,
  lng: -84.5120
};

// Test deployed API
async function testDeployedApi() {
  console.log('\n🔍 Testing deployed API...');
  console.log(`API URL: ${DEPLOYED_API_URL}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(DEPLOYED_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Mode': 'true'
      },
      body: JSON.stringify({ lane: TEST_LANE })
    });
    
    const duration = Date.now() - startTime;
    console.log(`Response time: ${duration}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      console.log('Response body:');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.success) {
        console.log('✅ API test SUCCESSFUL!');
        
        // Check for pairs array
        if (data.pairs && Array.isArray(data.pairs)) {
          console.log(`Found ${data.pairs.length} pairs`);
        } else {
          console.log('API returned success but no pairs (expected with minimal version)');
        }
      } else {
        console.log('❌ API returned success=false');
      }
    } catch (e) {
      console.log('Response not valid JSON:');
      console.log(responseText);
      console.log('❌ API test FAILED: Could not parse response');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Test direct Supabase function
async function testSupabaseFunction() {
  console.log('\n🔍 Testing direct Supabase function...');
  
  if (!SUPABASE_KEY) {
    console.log('⚠️ No Supabase key available. Skipping direct function test.');
    console.log('Set SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY in environment variables to test.');
    return;
  }
  
  const directUrl = `${SUPABASE_URL}/rest/v1/rpc/find_cities_within_radius`;
  console.log(`Direct URL: ${directUrl}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(directUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify({
        lat_param: CINCINNATI_COORDS.lat,
        lng_param: CINCINNATI_COORDS.lng,
        radius_miles: 50 // Test with 50 miles radius
      })
    });
    
    const duration = Date.now() - startTime;
    console.log(`Response time: ${duration}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    
    try {
      const data = JSON.parse(responseText);
      console.log('Response body (first 5 items):');
      
      if (Array.isArray(data)) {
        console.log(`Found ${data.length} cities within 50 miles`);
        
        // Show sample cities
        if (data.length > 0) {
          console.log('Sample cities:');
          data.slice(0, 5).forEach((city, index) => {
            console.log(`${index + 1}. ${city.city}, ${city.state_or_province} (${city.zip}) - Distance: ${city.distance_miles?.toFixed(2) || 'N/A'} miles`);
          });
        }
        
        console.log('✅ Supabase function test SUCCESSFUL!');
      } else {
        console.log(JSON.stringify(data, null, 2));
        console.log('❌ Supabase function did not return an array');
      }
    } catch (e) {
      console.log('Response not valid JSON:');
      console.log(responseText);
      console.log('❌ Supabase function test FAILED: Could not parse response');
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Run tests
async function runTests() {
  // Test the deployed API first
  await testDeployedApi();
  
  // Then test the direct Supabase function
  await testSupabaseFunction();
}

runTests();