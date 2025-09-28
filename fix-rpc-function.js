// fix-rpc-function.js
// Emergency script to fix the missing RPC function in production
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Check if required environment variables exist
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Required environment variables missing');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixRpcFunction() {
  console.log('🔧 Starting RPC function repair process...');
  console.log(`🔗 Connected to Supabase: ${supabaseUrl}`);
  
  try {
    // Check if we can access the database
    console.log('🔍 Testing database connectivity...');
    const { data: testData, error: testError } = await supabase
      .from('cities')
      .select('count')
      .limit(1);
      
    if (testError) {
      console.error('❌ Database connectivity test failed:', testError.message);
      process.exit(1);
    }
    
    console.log('✅ Database connection successful');
    
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
    
    // Execute the SQL using the rpc function
    console.log('🚀 Creating RPC function...');
    
    // Use direct SQL for creating function
    const { data, error } = await supabase.rpc('pgmigration_execute', { querystring: functionSQL });
    
    if (error) {
      console.error('❌ Error creating function:', error.message);
      console.error('Please run fix-missing-rpc-function.sql manually in the Supabase SQL Editor');
      process.exit(1);
    }
    
    console.log('✅ Function creation SQL executed successfully');
    
    // Test the function to verify it works
    console.log('🧪 Testing the function with Raleigh, NC coordinates...');
    
    const { data: testResult, error: testFuncError } = await supabase.rpc('find_cities_within_radius', {
      lat_param: 35.7796,
      lng_param: -78.6382,
      radius_meters: 80467 // ~50 miles
    });
    
    if (testFuncError) {
      console.error('❌ Function test failed:', testFuncError.message);
      console.error('The function may not have been created correctly');
      process.exit(1);
    }
    
    if (!testResult || testResult.length === 0) {
      console.warn('⚠️ Function returned no results - this might be expected if no cities are within range');
    } else {
      console.log(`✅ Function test successful! Found ${testResult.length} cities near Raleigh, NC`);
      console.log('📍 Sample city from results:', testResult[0]?.city);
    }
    
    console.log('');
    console.log('🎉 RPC FUNCTION REPAIR COMPLETE!');
    console.log('');
    console.log('ℹ️ Next steps:');
    console.log('1. Set ALLOW_TEST_MODE=true in Vercel environment variables');
    console.log('2. Use api-verification-test.js to verify the API');
    console.log('3. Update pages/api/intelligence-pairing.js to disable DEBUG_MODE in production');
    console.log('');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

// Run the function
fixRpcFunction();