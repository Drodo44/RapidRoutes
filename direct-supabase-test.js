// direct-supabase-test.js
// Tests the direct Supabase function

import fetch from 'node-fetch';

// API URLs
const SUPABASE_URL = 'https://gwuhjxomavulwduhvgvi.supabase.co';
// Use the anon key from .env
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiY3lkdGJ5cXhvcnljcmhlaGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTc0MzA2NjksImV4cCI6MjAzMzAwNjY2OX0.JIliP9R_YO2nM9UFkXzLrEmZvVsN5dfukwb0axP4sWQ';

// Coordinates for Cincinnati, OH
const CINCINNATI_COORDS = {
  lat: 39.1031,
  lng: -84.5120
};

// Test direct Supabase function
async function testSupabaseFunction() {
  console.log('\n🔍 Testing direct Supabase function...');
  
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
    console.log('Raw response:', responseText);
    
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
      console.log('Response not valid JSON:', e.message);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Run test
testSupabaseFunction();