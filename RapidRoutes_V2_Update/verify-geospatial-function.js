// verify-geospatial-function.js
// This script checks the implementation of the geospatial function in the database

import { adminSupabase as supabase } from './utils/supabaseClient.js';

async function verifyGeospatialFunction() {
  console.log('Verifying geospatial database function...');
  
  try {
    // Step 1: Verify the function exists by checking its metadata
    console.log('Step 1: Checking function existence...');
    const { data: functionData, error: functionError } = await supabase
      .rpc('get_function_info', { function_name: 'find_cities_within_radius' });
    
    if (functionError) {
      console.error('❌ Error checking function:', functionError);
      return;
    }
    
    if (!functionData || functionData.length === 0) {
      console.error('❌ Function find_cities_within_radius does not exist!');
      console.log('Creating the function...');
      
      // Read the SQL script to create the function
      const fs = require('fs');
      const sql = fs.readFileSync('./create-geospatial-function.sql', 'utf8');
      
      // Execute the SQL script
      const { error: createError } = await supabase.rpc('exec_sql', { sql });
      
      if (createError) {
        console.error('❌ Error creating function:', createError);
        return;
      }
      
      console.log('✅ Function created successfully!');
    } else {
      console.log('✅ Function exists:', functionData);
    }
    
    // Step 2: Test the function with known coordinates
    console.log('\nStep 2: Testing function with Atlanta, GA coordinates...');
    
    // Atlanta coordinates
    const lat = 33.749;
    const lng = -84.388;
    
    // Test with 50-mile radius
    const radius = 50;
    
    // Test parameter variations
    const tests = [
      {
        name: 'Direct coordinates with latitude/longitude',
        params: { lat_param: lat, lng_param: lng, radius_miles: radius }
      },
      {
        name: 'Direct coordinates with radius in meters',
        params: { lat_param: lat, lng_param: lng, radius_meters: radius * 1609.34 }
      },
      {
        name: 'City name based lookup',
        params: { p_city: 'Atlanta', p_state: 'GA', p_radius_miles: radius }
      }
    ];
    
    for (const test of tests) {
      console.log(`\nRunning test: ${test.name}`);
      console.log('Parameters:', test.params);
      
      const { data: cities, error: citiesError } = await supabase
        .rpc('find_cities_within_radius', test.params);
      
      if (citiesError) {
        console.error(`❌ Error with ${test.name}:`, citiesError);
        continue;
      }
      
      if (!cities || cities.length === 0) {
        console.error(`❌ No cities found with ${test.name}`);
        continue;
      }
      
      console.log(`✅ Found ${cities.length} cities within ${radius} miles`);
      console.log('Sample cities:', cities.slice(0, 3).map(c => `${c.city}, ${c.state_or_province} (${c.distance_miles?.toFixed(1)}mi)`));
      
      // Check KMA distribution
      const kmas = new Set(cities.filter(c => c.kma_code).map(c => c.kma_code));
      console.log(`Found ${kmas.size} unique KMAs`);
      
      if (kmas.size < 6) {
        console.warn('⚠️ Less than 6 unique KMAs found. This may cause issues with DAT CSV generation.');
      }
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

verifyGeospatialFunction();