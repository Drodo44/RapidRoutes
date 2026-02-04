-- ============================================================================
-- FULL DATABASE MAPPING - SQL Setup
-- ============================================================================
-- Run this in Supabase FIRST, then run: node scripts/compute-all-cities.mjs
-- ============================================================================

-- Step 1: Add column
ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS nearby_cities JSONB DEFAULT NULL;

-- Step 2: Create index
CREATE INDEX IF NOT EXISTS idx_cities_nearby 
ON cities USING GIN (nearby_cities);

-- Step 3: Create helper function for Node.js script
CREATE OR REPLACE FUNCTION get_nearby_cities_raw(
  target_lat DOUBLE PRECISION,
  target_lon DOUBLE PRECISION,
  target_city TEXT,
  target_state TEXT
)
RETURNS TABLE (
  city TEXT,
  state_or_province TEXT,
  zip TEXT,
  kma_code TEXT,
  kma_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  miles NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.city,
    c.state_or_province,
    c.zip,
    c.kma_code,
    c.kma_name,
    c.latitude,
    c.longitude,
    ROUND(CAST(
      ST_Distance(
        ST_MakePoint(target_lon, target_lat)::geography,
        ST_MakePoint(c.longitude, c.latitude)::geography
      ) / 1609.34 AS numeric), 1) AS miles
  FROM cities c
  WHERE c.latitude IS NOT NULL
    AND c.longitude IS NOT NULL
    AND (c.city != target_city OR c.state_or_province != target_state)
    AND ST_DWithin(
      ST_MakePoint(target_lon, target_lat)::geography,
      ST_MakePoint(c.longitude, c.latitude)::geography,
      160934  -- 100 miles in meters
    )
  ORDER BY ST_Distance(
    ST_MakePoint(target_lon, target_lat)::geography,
    ST_MakePoint(c.longitude, c.latitude)::geography
  );
END;
$$ LANGUAGE plpgsql;

SELECT 'Setup complete! Now run: node scripts/compute-all-cities.mjs' AS next_step;
