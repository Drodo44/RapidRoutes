#!/usr/bin/env node
import 'dotenv/config';
import { adminSupabase } from './utils/supabaseClient.js';

console.log('🔧 Creating missing find_cities_within_radius RPC function...');

// SQL to create the function
const functionSQL = `
-- Drop function if exists to avoid conflicts
DROP FUNCTION IF EXISTS find_cities_within_radius(double precision, double precision, double precision);

-- Create the PostGIS helper function for geospatial city search
CREATE OR REPLACE FUNCTION find_cities_within_radius(lat_param double precision, lng_param double precision, radius_meters double precision)
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
  // Try to execute SQL using the from() query builder with raw SQL
  console.log('Attempting to create function...');
  
  // First check if we can query cities table to ensure basic connectivity
  const { data: testData, error: testError } = await adminSupabase
    .from('cities')
    .select('city, state_or_province')
    .limit(1);
    
  if (testError) {
    console.error('❌ Basic connectivity test failed:', testError);
    process.exit(1);
  }
  
  console.log('✅ Basic connectivity confirmed');
  console.log('📊 Sample city:', testData[0]);
  
  // Check current functions (this might work or fail)
  try {
    const { data: funcTest, error: funcError } = await adminSupabase.rpc('find_cities_within_radius', {
      lat_param: 35.7796,
      lng_param: -78.6382,
      radius_meters: 80467
    });
    
    if (!funcError) {
      console.log('✅ Function already exists and working!');
      console.log(`📍 Found ${funcTest.length} cities within radius`);
      process.exit(0);
    }
    
    console.log('⚠️ Function missing or broken:', funcError.message);
  } catch (e) {
    console.log('⚠️ Function does not exist:', e.message);
  }
  
  // The function doesn't exist, we need a different approach
  console.log('');
  console.log('🚨 CRITICAL ISSUE: The find_cities_within_radius RPC function is missing from Supabase');
  console.log('');
  console.log('📋 MANUAL STEPS REQUIRED:');
  console.log('1. Open your Supabase Dashboard');
  console.log('2. Go to SQL Editor');
  console.log('3. Execute this SQL:');
  console.log('');
  console.log('--- COPY THIS SQL TO SUPABASE DASHBOARD ---');
  console.log(functionSQL);
  console.log('--- END OF SQL ---');
  console.log('');
  console.log('Or run this file: fix-missing-rpc-function.sql in Supabase SQL Editor');
  
} catch (error) {
  console.error('❌ Script failed:', error);
  console.log('');
  console.log('🔧 ALTERNATIVE: Use Supabase Dashboard SQL Editor to execute:');
  console.log('File: fix-missing-rpc-function.sql');
}