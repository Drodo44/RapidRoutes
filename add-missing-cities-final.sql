-- SQL script to add missing cities to the database
-- These cities were not found during lane generation queries

-- First, let's check if these cities already exist (for safety)
SELECT city, state_or_province, zip, kma_code, kma_name 
FROM cities 
WHERE (city ILIKE 'Riegelwood' AND state_or_province = 'NC')
   OR (city ILIKE 'Points' AND state_or_province = 'WV') 
   OR (city ILIKE 'Mount Holly' AND state_or_province = 'NJ')
   OR (city ILIKE 'Grove City' AND state_or_province = 'PA');

-- Add missing cities with proper KMA assignments
INSERT INTO cities (city, state_or_province, zip, latitude, longitude, kma_code, kma_name)
VALUES 
  -- Riegelwood, NC - Wilmington KMA
  ('Riegelwood', 'NC', '28456', 34.6032, -78.2947, 'WIL', 'Wilmington Market'),
  
  -- Points, WV - Winchester KMA  
  ('Points', 'WV', '25437', 39.3123, -77.9689, 'WIN', 'Winchester Market'),
  
  -- Mount Holly, NJ - Philadelphia KMA
  ('Mount Holly', 'NJ', '08060', 39.9929, -74.7879, 'PHL', 'Philadelphia Market'),
  
  -- Grove City, PA - Pittsburgh KMA
  ('Grove City', 'PA', '16127', 41.1581, -80.0881, 'PIT', 'Pittsburgh Market')
ON CONFLICT (city, state_or_province, zip) DO UPDATE SET
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  kma_code = EXCLUDED.kma_code,
  kma_name = EXCLUDED.kma_name;

-- Verify the additions
SELECT city, state_or_province, zip, latitude, longitude, kma_code, kma_name 
FROM cities 
WHERE (city = 'Riegelwood' AND state_or_province = 'NC')
   OR (city = 'Points' AND state_or_province = 'WV') 
   OR (city = 'Mount Holly' AND state_or_province = 'NJ')
   OR (city = 'Grove City' AND state_or_province = 'PA')
ORDER BY state_or_province, city;
