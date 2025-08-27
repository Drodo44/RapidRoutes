-- Add missing freight cities to RapidRoutes database
-- Run this SQL in your Supabase SQL editor

-- First check if cities already exist to avoid duplicates
DO $$
BEGIN
  -- Add New Bedford, MA (Missing destination causing CSV export failures)
  IF NOT EXISTS (SELECT 1 FROM cities WHERE city = 'New Bedford' AND state_or_province = 'MA' AND zip = '02745') THEN
    INSERT INTO cities (city, state_or_province, zip, latitude, longitude, kma_code, kma_name) VALUES
      ('New Bedford', 'MA', '02745', 41.6362, -70.9342, 'BOS', 'Boston Market');
    RAISE NOTICE 'Added New Bedford, MA';
  ELSE
    RAISE NOTICE 'New Bedford, MA already exists';
  END IF;

  -- Add Ostrander, OH (Missing pickup location)
  IF NOT EXISTS (SELECT 1 FROM cities WHERE city = 'Ostrander' AND state_or_province = 'OH' AND zip = '43061') THEN
    INSERT INTO cities (city, state_or_province, zip, latitude, longitude, kma_code, kma_name) VALUES
      ('Ostrander', 'OH', '43061', 40.2570, -83.2132, 'COL', 'Columbus Market');
    RAISE NOTICE 'Added Ostrander, OH';
  ELSE
    RAISE NOTICE 'Ostrander, OH already exists';
  END IF;

  -- Add Spring Grove, IN (Missing destination)
  IF NOT EXISTS (SELECT 1 FROM cities WHERE city = 'Spring Grove' AND state_or_province = 'IN' AND zip = '47374') THEN
    INSERT INTO cities (city, state_or_province, zip, latitude, longitude, kma_code, kma_name) VALUES
      ('Spring Grove', 'IN', '47374', 39.6428, -84.8297, 'CIN', 'Cincinnati Market');
    RAISE NOTICE 'Added Spring Grove, IN';
  ELSE
    RAISE NOTICE 'Spring Grove, IN already exists';
  END IF;

  -- Add Centerville, IN (Missing pickup location)
  IF NOT EXISTS (SELECT 1 FROM cities WHERE city = 'Centerville' AND state_or_province = 'IN' AND zip = '47330') THEN
    INSERT INTO cities (city, state_or_province, zip, latitude, longitude, kma_code, kma_name) VALUES
      ('Centerville', 'IN', '47330', 39.8123, -84.9641, 'CIN', 'Cincinnati Market');
    RAISE NOTICE 'Added Centerville, IN';
  ELSE
    RAISE NOTICE 'Centerville, IN already exists';
  END IF;
END $$;

-- Verify all cities were added successfully
SELECT 
  city, 
  state_or_province, 
  zip, 
  kma_code, 
  kma_name,
  'SUCCESS - City added to database' as status
FROM cities 
WHERE 
  (city = 'New Bedford' AND state_or_province = 'MA' AND zip = '02745') OR
  (city = 'Ostrander' AND state_or_province = 'OH' AND zip = '43061') OR
  (city = 'Spring Grove' AND state_or_province = 'IN' AND zip = '47374') OR
  (city = 'Centerville' AND state_or_province = 'IN' AND zip = '47330')
ORDER BY state_or_province, city;
