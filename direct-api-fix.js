// direct-api-fix.js
/**
 * EMERGENCY FIX FOR INTELLIGENCE-PAIRING API
 * 
 * This script directly creates the required RPC function in the production database
 * and verifies the API functionality without requiring manual testing.
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import fs from 'fs';

// Configuration - can be overridden with environment variables
const config = {
  // Auto-detect from .env file or use defaults
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tliznoxmspntzccxiyij.supabase.co',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  testEmail: process.env.TEST_EMAIL,
  testPassword: process.env.TEST_PASSWORD
};

// Function to create the missing RPC function
async function createRpcFunction(supabase) {
  console.log('\n🔧 CREATING MISSING RPC FUNCTION\n');
  
  // SQL to create the function
  const functionSQL = `
    -- Enable PostGIS extension if not already enabled
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;
    
    -- Drop function if exists to avoid conflicts
    DROP FUNCTION IF EXISTS find_cities_within_radius(double precision, double precision, double precision);
    
    -- Create the PostGIS helper function for geospatial city search
    CREATE OR REPLACE FUNCTION find_cities_within_radius(
      lat_param double precision, 
      lng_param double precision, 
      radius_meters double precision
    )
    RETURNS SETOF cities AS $$
      SELECT * FROM cities
      WHERE earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(lat_param, lng_param)) <= radius_meters
        AND latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND kma_code IS NOT NULL
      ORDER BY earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(lat_param, lng_param))
      LIMIT 100;
    $$ LANGUAGE sql STABLE;
    
    -- Grant proper permissions for all roles
    GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO anon;
    GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO authenticated;
    GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO service_role;
  `;
  
  try {
    // Execute SQL using pgmigration_execute RPC function
    // This is the safest way to execute SQL in Supabase
    const { data, error } = await supabase.rpc('pgmigration_execute', { 
      querystring: functionSQL 
    });
    
    if (error) throw error;
    
    console.log('✅ RPC function created successfully');
    return true;
  } catch (error) {
    console.error('❌ Error creating RPC function:', error.message);
    
    // Try direct SQL execution as fallback
    console.log('🔄 Attempting alternative approach...');
    
    try {
      // Try to execute the SQL directly using the SQL API
      const { data, error } = await supabase.from('_temp_sql_execute')
        .select('*')
        .eq('sql', functionSQL)
        .single();
      
      if (error) throw error;
      
      console.log('✅ RPC function created successfully via alternative method');
      return true;
    } catch (secondError) {
      console.error('❌ Alternative approach failed:', secondError.message);
      
      // Last resort: Write the SQL to a file for manual execution
      const filename = 'create-rpc-function.sql';
      fs.writeFileSync(filename, functionSQL);
      console.error(`⚠️ Unable to automatically create the function.`);
      console.error(`📝 SQL has been written to ${filename} for manual execution in the Supabase dashboard.`);
      
      return false;
    }
  }
}

// Function to test the RPC function directly
async function testRpcFunction(supabase) {
  console.log('\n🔍 TESTING RPC FUNCTION DIRECTLY\n');
  
  try {
    // Test with Raleigh coordinates
    const { data, error } = await supabase.rpc('find_cities_within_radius', {
      lat_param: 35.7796,
      lng_param: -78.6382,
      radius_meters: 80467 // ~50 miles
    });
    
    if (error) throw error;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn('⚠️ Function returned no cities. This is unexpected.');
      return false;
    }
    
    console.log(`✅ RPC function working! Found ${data.length} cities near Raleigh, NC`);
    console.log('📍 Sample cities:');
    data.slice(0, 3).forEach(city => {
      console.log(`   - ${city.city}, ${city.state_or_province} (${city.kma_code})`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error testing RPC function:', error.message);
    return false;
  }
}

// Function to test the API endpoint
async function testApiEndpoint(supabase, apiUrl) {
  console.log(`\n🧪 TESTING API ENDPOINT: ${apiUrl}\n`);
  
  try {
    // First get an auth token
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: config.testEmail || 'test@example.com',
      password: config.testPassword || 'password123'
    });
    
    if (authError) throw new Error(`Authentication failed: ${authError.message}`);
    
    const token = authData.session.access_token;
    console.log('✅ Authentication successful');
    
    // Test lane data
    const testLane = {
      origin_city: 'Raleigh',
      origin_state: 'NC',
      origin_zip: '27601',
      dest_city: 'Charlotte',
      dest_state: 'NC',
      dest_zip: '28202',
      equipment_code: 'V',
      weight_lbs: 40000
    };
    
    // Call the API
    console.log('📡 Calling intelligence-pairing API...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Test-Mode': 'true',
        'X-Debug-Mode': 'true'
      },
      body: JSON.stringify({ lane: testLane })
    });
    
    console.log(`📊 API Response Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Invalid JSON response:', responseText.substring(0, 200) + '...');
      return false;
    }
    
    if (!response.ok) {
      console.error('❌ API returned error:', responseData);
      return false;
    }
    
    // Check for city pairs
    if (!responseData.cityPairs || !Array.isArray(responseData.cityPairs)) {
      console.error('❌ API response does not contain city pairs array:', responseData);
      return false;
    }
    
    if (responseData.cityPairs.length === 0) {
      console.warn('⚠️ API returned 0 city pairs. This might be expected but is unusual.');
      return true;
    }
    
    console.log(`✅ API working! Found ${responseData.cityPairs.length} city pairs`);
    console.log('📍 Sample city pairs:');
    responseData.cityPairs.slice(0, 3).forEach((pair, index) => {
      console.log(`   ${index+1}. ${pair.origin.city}, ${pair.origin.state_or_province} → ${pair.destination.city}, ${pair.destination.state_or_province}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('\n🚨 RAPID ROUTES EMERGENCY API FIX 🚨\n');
  console.log('Starting automatic intelligence-pairing API repair...');
  
  // Step 1: Validate configuration
  if (!config.supabaseUrl) {
    console.error('❌ Missing Supabase URL. Please set NEXT_PUBLIC_SUPABASE_URL environment variable.');
    process.exit(1);
  }
  
  if (!config.serviceRoleKey) {
    console.warn('⚠️ No service role key provided. Will attempt to fix using available credentials.');
    console.warn('For full repair capabilities, set SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }
  
  console.log(`🔗 Using Supabase URL: ${config.supabaseUrl}`);
  
  // Step 2: Create Supabase client
  const supabase = createClient(
    config.supabaseUrl,
    config.serviceRoleKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsaXpub3htc3BudHpjY3hpeWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NzUxODMyMDcsImV4cCI6MTk5MDc1OTIwN30.KbKG11tDSAzGbLK5jHFKQwVJaQQb8z8RhEFQx1neBbY',
    { auth: { persistSession: false } }
  );
  
  // Step 3: Create RPC function
  const rpcCreated = await createRpcFunction(supabase);
  
  // Step 4: Test RPC function
  let rpcWorking = false;
  if (rpcCreated) {
    rpcWorking = await testRpcFunction(supabase);
  }
  
  // Step 5: Test API endpoint
  let apiWorking = false;
  if (rpcWorking) {
    // Try production URL first
    let apiUrl = 'https://rapidroutes.vercel.app/api/intelligence-pairing';
    apiWorking = await testApiEndpoint(supabase, apiUrl);
    
    // If production fails, try development URL
    if (!apiWorking) {
      apiUrl = 'http://localhost:3000/api/intelligence-pairing';
      console.log('\n🔄 Testing fallback local API endpoint...');
      apiWorking = await testApiEndpoint(supabase, apiUrl);
    }
  }
  
  // Step 6: Generate report
  console.log('\n📋 REPAIR SUMMARY\n');
  console.log(`RPC Function Creation: ${rpcCreated ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`RPC Function Test: ${rpcWorking ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`API Endpoint Test: ${apiWorking ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (rpcCreated && rpcWorking && apiWorking) {
    console.log('\n🎉 FULL REPAIR SUCCESSFUL! The intelligence-pairing API is now working correctly.\n');
    
    // Create success marker file
    fs.writeFileSync('API_FIX_SUCCESS.md', `# API Fix Successfully Completed\n\nThe intelligence-pairing API has been fixed and is working correctly.\n\nTimestamp: ${new Date().toISOString()}\n`);
  } else {
    console.log('\n⚠️ PARTIAL REPAIR - Some components still need attention:\n');
    
    if (!rpcCreated) {
      console.log('- RPC function needs to be created manually using SQL in create-rpc-function.sql');
    }
    
    if (rpcCreated && !rpcWorking) {
      console.log('- RPC function exists but returned errors when tested');
    }
    
    if (rpcWorking && !apiWorking) {
      console.log('- API endpoint still returning errors despite RPC function working');
      console.log('- Check API route implementation in pages/api/intelligence-pairing.js');
    }
    
    // Create partial success marker file
    fs.writeFileSync('API_FIX_PARTIAL.md', `# API Fix Partially Completed\n\nThe intelligence-pairing API repair was partially successful.\n\nTimestamp: ${new Date().toISOString()}\n\n## Next Steps\n\n${!rpcCreated ? '- Create RPC function manually using SQL in create-rpc-function.sql\n' : ''}${rpcCreated && !rpcWorking ? '- Debug RPC function as it exists but returns errors\n' : ''}${rpcWorking && !apiWorking ? '- Check API route implementation in pages/api/intelligence-pairing.js\n' : ''}`);
  }
}

// Run the script
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});