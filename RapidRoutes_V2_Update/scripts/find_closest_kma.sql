-- /scripts/find_closest_kma.sql
-- SQL function to find the closest KMA to a given lat/long point

-- Create extension if it doesn't exist (might require superuser)
-- CREATE EXTENSION IF NOT EXISTS earthdistance;
-- CREATE EXTENSION IF NOT EXISTS cube;

-- Function to find the closest KMA
CREATE OR REPLACE FUNCTION find_closest_kma(
  lat double precision,
  lon double precision,
  max_distance_miles double precision DEFAULT 100
)
RETURNS TABLE (
  kma_code text,
  kma_name text,
  distance_miles double precision,
  city text,
  state_or_province text
) AS $$
BEGIN
  -- Convert miles to meters (1 mile = 1609.34 meters)
  DECLARE max_distance_meters double precision := max_distance_miles * 1609.34;
  
  -- If earthdistance extension is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'earthdistance') THEN
    RETURN QUERY 
    SELECT 
      c.kma_code,
      c.kma_name,
      (point(c.longitude, c.latitude) <@> point(lon, lat))::double precision AS distance_miles,
      c.city,
      c.state_or_province
    FROM 
      cities c
    WHERE 
      c.kma_code IS NOT NULL
      AND (point(c.longitude, c.latitude) <@> point(lon, lat)) <= max_distance_miles
    ORDER BY 
      distance_miles
    LIMIT 1;
  
  -- Fallback if earthdistance is not available - uses Pythagorean formula
  -- Not as accurate but works without extensions
  ELSE
    RETURN QUERY 
    SELECT 
      c.kma_code,
      c.kma_name,
      SQRT(POWER(69.1 * (c.latitude - lat), 2) + 
           POWER(69.1 * (c.longitude - lon) * COS(lat / 57.3), 2))::double precision AS distance_miles,
      c.city,
      c.state_or_province
    FROM 
      cities c
    WHERE 
      c.kma_code IS NOT NULL
      AND SQRT(POWER(69.1 * (c.latitude - lat), 2) + 
              POWER(69.1 * (c.longitude - lon) * COS(lat / 57.3), 2)) <= max_distance_miles
    ORDER BY 
      distance_miles
    LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql;