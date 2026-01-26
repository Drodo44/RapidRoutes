-- Create the missing find_cities_within_radius RPC function
-- This function is essential for geographic crawl pair generation

-- Drop function if exists to avoid conflicts
DROP FUNCTION IF EXISTS find_cities_within_radius(double precision, double precision, double precision);

-- Create the PostGIS helper function for geospatial city search
-- Usage: select * from find_cities_within_radius(lat_param, lng_param, radius_meters)
CREATE OR REPLACE FUNCTION find_cities_within_radius(lat_param double precision, lng_param double precision, radius_meters double precision)
RETURNS SETOF cities AS $$
  SELECT * FROM cities
  WHERE earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(lat_param, lng_param)) <= radius_meters
    AND latitude IS NOT NULL 
    AND longitude IS NOT NULL
    AND kma_code IS NOT NULL  -- Ensure KMA diversity
  ORDER BY earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(lat_param, lng_param))
  LIMIT 100;  -- Prevent excessive results
$$ LANGUAGE sql STABLE;

-- Grant proper permissions for all roles
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO service_role;

-- Test the function with Raleigh, NC coordinates (should return cities within ~50 miles)
SELECT 
  city, 
  state_or_province, 
  kma_name,
  ROUND(earth_distance(ll_to_earth(latitude, longitude), ll_to_earth(35.7796, -78.6382))) as distance_meters
FROM find_cities_within_radius(35.7796, -78.6382, 80467)
LIMIT 10;