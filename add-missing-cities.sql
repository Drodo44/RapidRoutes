-- Add missing cities to fix lane generation
-- Execute this in your Supabase SQL editor

INSERT INTO cities (city, state_or_province, zip, kma_code, kma_name, latitude, longitude)
VALUES 
  ('Berlin', 'NJ', '08009', 'NJ_PHI', 'Philadelphia', 39.7909, -74.9286),
  ('Oakland', 'NJ', '07436', 'NJ_ELI', 'Elizabeth', 41.0262, -74.2376)
ON CONFLICT (city, state_or_province) DO UPDATE SET
  zip = EXCLUDED.zip,
  kma_code = EXCLUDED.kma_code,
  kma_name = EXCLUDED.kma_name,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude;

-- Verify the cities were added
SELECT city, state_or_province, zip, kma_code, kma_name 
FROM cities 
WHERE (city = 'Berlin' AND state_or_province = 'NJ') 
   OR (city = 'Oakland' AND state_or_province = 'NJ');
