#!/usr/bin/env node

// interactive-supabase-test.js
// A simple interactive script to test the Supabase RPC function

const readline = require('readline');
const fetch = require('node-fetch');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Coordinates for Cincinnati, OH
const CINCINNATI_COORDS = {
  lat: 39.1031,
  lng: -84.5120
};

async function runTest(supabaseUrl, apiKey) {
  console.log('\n🔍 Testing Supabase function...');
  
  const directUrl = `${supabaseUrl}/rest/v1/rpc/find_cities_within_radius`;
  console.log(`Direct URL: ${directUrl}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(directUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
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
      
      if (Array.isArray(data)) {
        console.log(`Found ${data.length} cities within 50 miles`);
        
        // Show sample cities
        if (data.length > 0) {
          console.log('Sample cities:');
          data.slice(0, 5).forEach((city, index) => {
            console.log(`${index + 1}. ${city.city}, ${city.state_or_province} (${city.zip})`);
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
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Prompt for Supabase URL
rl.question('Enter your Supabase URL (e.g., https://example.supabase.co): ', (supabaseUrl) => {
  // Prompt for API key
  rl.question('Enter your Supabase API key: ', (apiKey) => {
    rl.close();
    runTest(supabaseUrl, apiKey);
  });
});