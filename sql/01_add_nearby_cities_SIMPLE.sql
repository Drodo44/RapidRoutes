-- ============================================================================
-- Migration 1: SIMPLE VERSION - Just add column, compute on-demand
-- ============================================================================
-- Purpose: Add nearby_cities column, populate it when lanes are accessed
-- Strategy: Compute cities only when needed (lazy loading)
-- Performance: Instant setup, ~2-3 seconds per city when first accessed
-- ============================================================================

-- Step 1: Add the nearby_cities column
ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS nearby_cities JSONB DEFAULT NULL;

-- Step 2: Create GIN index for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_cities_nearby 
ON cities USING GIN (nearby_cities);

-- Step 3: Create function to compute nearby cities for a single city
CREATE OR REPLACE FUNCTION compute_nearby_cities(target_city_id INT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'computed_at', NOW(),
    'kmas', jsonb_object_agg(
      kma_code,
      cities_array
    )
  ) INTO result
  FROM (
    SELECT 
      COALESCE(c2.kma_code, 'NO_KMA') AS kma_code,
      jsonb_agg(
        jsonb_build_object(
          'city', c2.city,
          'state', c2.state_or_province,
          'zip', c2.zip,
          'kma_code', c2.kma_code,
          'kma_name', c2.kma_name,
          'latitude', c2.latitude,
          'longitude', c2.longitude,
          'miles', ROUND(CAST(
            ST_Distance(
              ST_MakePoint(c1.longitude, c1.latitude)::geography,
              ST_MakePoint(c2.longitude, c2.latitude)::geography
            ) / 1609.34 AS numeric), 1)
        ) ORDER BY ST_Distance(
          ST_MakePoint(c1.longitude, c1.latitude)::geography,
          ST_MakePoint(c2.longitude, c2.latitude)::geography
        )
      ) AS cities_array
    FROM cities c1
    CROSS JOIN cities c2
    WHERE c1.id = target_city_id
      AND c2.latitude IS NOT NULL
      AND c2.longitude IS NOT NULL
      AND (c2.city != c1.city OR c2.state_or_province != c1.state_or_province)
      AND ST_DWithin(
        ST_MakePoint(c1.longitude, c1.latitude)::geography,
        ST_MakePoint(c2.longitude, c2.latitude)::geography,
        160934  -- 100 miles in meters
      )
    GROUP BY c2.kma_code
  ) kma_groups;
  
  -- Update the city with computed data
  UPDATE cities 
  SET nearby_cities = result 
  WHERE id = target_city_id;
  
  RETURN result;
END;
$$;

-- Done! Cities will be computed on-demand when brokers access them
SELECT 'Migration complete! Nearby cities will be computed on-demand.' AS status;
