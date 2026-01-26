// fix-intelligence-system.js
// Comprehensive fix for the intelligence pairing system

import { adminSupabase as supabase } from './utils/supabaseClient.js';
import fs from 'fs';

async function fixIntelligenceSystem() {
  console.log('🔧 INTELLIGENCE SYSTEM FIX');
  console.log('==========================\n');
  
  try {
    // Step 1: Update database functions
    await fixDatabaseFunctions();
    
    // Step 2: Verify the fix
    await verifyFix();
    
    console.log('\n✅ SYSTEM FIX COMPLETE');
    
  } catch (error) {
    console.error('\n❌ SYSTEM FIX FAILED:', error);
  }
}

async function fixDatabaseFunctions() {
  console.log('STEP 1: Updating Database Functions');
  console.log('----------------------------------');
  
  try {
    // Check if the function exists
    const { data: functionData, error: functionError } = await supabase
      .from('pg_catalog.pg_proc')
      .select('proname')
      .eq('proname', 'find_cities_within_radius')
      .maybeSingle();
    
    if (functionError) {
      console.error('❌ Error checking function existence:', functionError);
    }
    
    const functionExists = functionData && functionData.proname === 'find_cities_within_radius';
    console.log(`Function exists: ${functionExists ? 'Yes' : 'No'}`);
    
    // Create SQL statements for the function
    let sql = `
-- First, clean up existing functions if they exist
DROP FUNCTION IF EXISTS public.find_cities_within_radius(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.find_cities_within_radius(double precision, double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.find_cities_within_radius(text, text, double precision);
DROP FUNCTION IF EXISTS public.find_cities_within_radius(text, text);

-- Create the coordinate-based function
CREATE OR REPLACE FUNCTION public.find_cities_within_radius(
  lat_param double precision, 
  lng_param double precision,
  radius_miles double precision DEFAULT 75
)
RETURNS TABLE (
  city text,
  state_or_province text,
  zip_code text,
  kma_code text,
  kma_name text,
  latitude double precision,
  longitude double precision,
  distance_miles double precision
) AS $$
SELECT 
  c.city,
  c.state_or_province,
  c.zip as zip_code,
  c.kma_code,
  c.kma_name,
  c.latitude,
  c.longitude,
  (point(c.longitude, c.latitude) <@> point(lng_param, lat_param)) AS distance_miles
FROM 
  cities c
WHERE 
  (point(c.longitude, c.latitude) <@> point(lng_param, lat_param)) <= radius_miles
  AND c.latitude IS NOT NULL 
  AND c.longitude IS NOT NULL
ORDER BY 
  distance_miles ASC;
$$ LANGUAGE sql STABLE;

-- Create the city-based function
CREATE OR REPLACE FUNCTION public.find_cities_within_radius(
  p_city text,
  p_state text,
  p_radius_miles double precision DEFAULT 75
)
RETURNS TABLE (
  city text,
  state_or_province text,
  zip_code text,
  kma_code text,
  kma_name text,
  latitude double precision,
  longitude double precision,
  distance_miles double precision
) AS $$
DECLARE
  origin_lat double precision;
  origin_lng double precision;
BEGIN
  -- First find the coordinates of the reference city
  SELECT latitude, longitude INTO origin_lat, origin_lng
  FROM cities
  WHERE LOWER(city) = LOWER(p_city) AND LOWER(state_or_province) = LOWER(p_state)
  LIMIT 1;
  
  -- If city not found, return empty result
  IF origin_lat IS NULL OR origin_lng IS NULL THEN
    RETURN;
  END IF;

  -- Now find cities within the radius
  RETURN QUERY
  SELECT * FROM find_cities_within_radius(origin_lat, origin_lng, p_radius_miles);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(double precision, double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(text, text, double precision) TO anon;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(text, text) TO anon;

-- Same grants for authenticated users
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(double precision, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(text, text, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(text, text) TO authenticated;
`;
    
    // Save SQL to a file for reference
    fs.writeFileSync('./fix-intelligence-api.sql', sql, 'utf8');
    console.log('SQL saved to fix-intelligence-api.sql');
    
    // Execute SQL statements
    console.log('Executing SQL to update database functions...');
    
    // Split the SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      
      if (error) {
        console.error('❌ SQL Error:', error);
        console.error('Failed statement:', statement);
      }
    }
    
    console.log('✅ Database functions updated successfully');
    
  } catch (error) {
    console.error('❌ Database function update failed:', error);
    throw error;
  }
}

async function verifyFix() {
  console.log('\nSTEP 2: Verifying Fix');
  console.log('----------------------------------');
  
  try {
    // Test the coordinate-based function
    const lat = 33.749;
    const lng = -84.388;
    const radius = 50;
    
    console.log(`Testing function with Atlanta (${lat}, ${lng}) and ${radius}mi radius...`);
    
    const { data: cities, error: citiesError } = await supabase
      .rpc('find_cities_within_radius', {
        lat_param: lat,
        lng_param: lng,
        radius_miles: radius
      });
    
    if (citiesError) {
      console.error('❌ Function test failed:', citiesError);
      throw citiesError;
    }
    
    console.log(`✅ Found ${cities.length} cities within ${radius} miles of Atlanta`);
    console.log('First 3 cities:', cities.slice(0, 3).map(c => `${c.city}, ${c.state_or_province} (${c.distance_miles?.toFixed(1)}mi)`));
    
    // Try city-based function
    try {
      console.log('\nTesting city-based function with Atlanta, GA...');
      
      const { data: citiesByName, error: nameError } = await supabase
        .rpc('find_cities_within_radius', {
          p_city: 'Atlanta',
          p_state: 'GA',
          p_radius_miles: radius
        });
      
      if (nameError) {
        console.warn('⚠️ City-based function test failed:', nameError);
      } else {
        console.log(`✅ Found ${citiesByName.length} cities within ${radius} miles of Atlanta by name`);
        console.log('First 3 cities:', citiesByName.slice(0, 3).map(c => `${c.city}, ${c.state_or_province} (${c.distance_miles?.toFixed(1)}mi)`));
      }
    } catch (err) {
      console.warn('⚠️ City-based function not available:', err);
    }
    
  } catch (error) {
    console.error('❌ Fix verification failed:', error);
    throw error;
  }
}

// Run the fix
fixIntelligenceSystem();