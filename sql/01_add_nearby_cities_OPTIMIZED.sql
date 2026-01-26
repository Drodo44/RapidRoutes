-- ============================================================================
-- Migration 1: Add nearby_cities JSONB column (OPTIMIZED for Supabase limits)
-- ============================================================================
-- Purpose: Pre-compute all nearby cities within 100 miles for each city
-- Performance: ~30-40 minutes (smaller batches to avoid timeouts)
-- Optimizations: 10 cities per batch, progress saves between batches
-- ============================================================================

-- Step 1: Add the nearby_cities column
ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS nearby_cities JSONB DEFAULT '{}'::jsonb;

-- Step 2: Create GIN index for fast JSONB queries
CREATE INDEX IF NOT EXISTS idx_cities_nearby 
ON cities USING GIN (nearby_cities);

-- Step 3: Batch compute nearby cities (SMALL BATCHES - 10 cities at a time)
DO $$
DECLARE
  batch_size INT := 10;  -- REDUCED from 100 to avoid timeout
  processed INT := 0;
  total_cities INT;
  cities_remaining INT;
  batch_start_time TIMESTAMP;
  batch_elapsed INTERVAL;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO total_cities 
  FROM cities 
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Starting nearby cities computation';
  RAISE NOTICE 'Total cities to process: %', total_cities;
  RAISE NOTICE 'Batch size: % cities', batch_size;
  RAISE NOTICE '===========================================';
  
  LOOP
    batch_start_time := clock_timestamp();
    
    -- Check how many cities still need processing
    SELECT COUNT(*) INTO cities_remaining
    FROM cities
    WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL
      AND (nearby_cities = '{}'::jsonb OR nearby_cities IS NULL);
    
    EXIT WHEN cities_remaining = 0;
    
    -- Process one small batch
    UPDATE cities c1
    SET nearby_cities = (
      SELECT jsonb_build_object(
        'computed_at', NOW(),
        'kmas', jsonb_object_agg(
          kma_code,
          cities_array
        )
      )
      FROM (
        SELECT 
          COALESCE(c3.kma_code, 'NO_KMA') AS kma_code,
          jsonb_agg(
            jsonb_build_object(
              'city', c3.city,
              'state', c3.state_or_province,
              'zip', c3.zip,
              'kma_code', c3.kma_code,
              'kma_name', c3.kma_name,
              'latitude', c3.latitude,
              'longitude', c3.longitude,
              'miles', ROUND(CAST(
                ST_Distance(
                  ST_MakePoint(c1.longitude, c1.latitude)::geography,
                  ST_MakePoint(c3.longitude, c3.latitude)::geography
                ) / 1609.34 AS numeric), 1)
            ) ORDER BY ST_Distance(
              ST_MakePoint(c1.longitude, c1.latitude)::geography,
              ST_MakePoint(c3.longitude, c3.latitude)::geography
            )
          ) AS cities_array
        FROM cities c3
        WHERE c3.latitude IS NOT NULL
          AND c3.longitude IS NOT NULL
          AND (c3.city != c1.city OR c3.state_or_province != c1.state_or_province)
          AND ST_DWithin(
            ST_MakePoint(c1.longitude, c1.latitude)::geography,
            ST_MakePoint(c3.longitude, c3.latitude)::geography,
            160934  -- 100 miles in meters
          )
        GROUP BY c3.kma_code
      ) kma_groups
    )
    WHERE c1.id IN (
      SELECT id FROM cities 
      WHERE latitude IS NOT NULL 
        AND longitude IS NOT NULL
        AND (nearby_cities = '{}'::jsonb OR nearby_cities IS NULL)
      ORDER BY id
      LIMIT batch_size
    );
    
    processed := processed + batch_size;
    batch_elapsed := clock_timestamp() - batch_start_time;
    
    -- Progress update every batch with timing
    IF processed % 100 = 0 OR cities_remaining < 100 THEN
      RAISE NOTICE 'Processed: % / % cities (%.1f%% complete) - Last batch: %s', 
        LEAST(processed, total_cities), 
        total_cities,
        (LEAST(processed, total_cities)::float / total_cities * 100),
        batch_elapsed;
    END IF;
    
    -- No sleep needed - small batches are fast
  END LOOP;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Computation complete!';
  RAISE NOTICE 'Total cities processed: %', total_cities;
  RAISE NOTICE '===========================================';
END $$;

-- Step 4: Verify the results
SELECT 
  COUNT(*) AS total_cities,
  COUNT(*) FILTER (WHERE nearby_cities IS NOT NULL AND nearby_cities != '{}'::jsonb) AS cities_with_data
FROM cities
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
