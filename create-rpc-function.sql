
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
  