-- Enhanced geospatial function for finding cities within radius
-- This version supports both direct coordinate-based lookup and city/state lookup

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Function to find cities within radius by coordinates
CREATE OR REPLACE FUNCTION find_cities_within_radius(
  lat_param double precision, 
  lng_param double precision,
  radius_miles double precision DEFAULT NULL,
  radius_meters double precision DEFAULT NULL
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
  actual_radius_meters double precision;
BEGIN
  -- Determine the actual radius to use (convert miles to meters if needed)
  IF radius_miles IS NOT NULL THEN
    actual_radius_meters := radius_miles * 1609.34; -- Convert miles to meters
  ELSIF radius_meters IS NOT NULL THEN
    actual_radius_meters := radius_meters;
  ELSE
    actual_radius_meters := 75 * 1609.34; -- Default 75 miles
  END IF;

  RETURN QUERY
  SELECT 
    c.city,
    c.state_or_province,
    c.zip,
    c.kma_code,
    c.kma_name,
    c.latitude,
    c.longitude,
    ST_Distance(
      ST_MakePoint(c.longitude, c.latitude)::geography,
      ST_MakePoint(lng_param, lat_param)::geography
    ) / 1609.34 AS distance_miles
  FROM 
    cities c
  WHERE 
    ST_DWithin(
      ST_MakePoint(c.longitude, c.latitude)::geography,
      ST_MakePoint(lng_param, lat_param)::geography,
      actual_radius_meters
    )
    AND c.latitude IS NOT NULL 
    AND c.longitude IS NOT NULL
  ORDER BY 
    distance_miles ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to find cities within radius by city/state
CREATE OR REPLACE FUNCTION find_cities_within_radius(
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

-- Function to inspect function definitions (helper)
CREATE OR REPLACE FUNCTION get_function_info(function_name text)
RETURNS TABLE (
  name text,
  definition text,
  language text,
  schema text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.proname::text,
    pg_get_functiondef(p.oid)::text,
    l.lanname::text,
    n.nspname::text
  FROM 
    pg_proc p
    JOIN pg_language l ON p.prolang = l.oid
    JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE 
    p.proname = function_name;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(text, text, double precision) TO anon;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(text, text) TO anon;
GRANT EXECUTE ON FUNCTION get_function_info(text) TO anon;

-- Same grants for authenticated users
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(text, text, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_function_info(text) TO authenticated;