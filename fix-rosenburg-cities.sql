-- Fix Rosenburg, TX city diversity issue
-- Step 1: Check what cities exist within 75 miles of Rosenburg, TX

SELECT 
  city,
  state_or_province,
  zip,
  kma_code,
  kma_name,
  latitude,
  longitude,
  ROUND(
    3959 * acos(
      cos(radians(29.5577)) * cos(radians(latitude)) *
      cos(radians(longitude) - radians(-95.8080)) +
      sin(radians(29.5577)) * sin(radians(latitude))
    )
  ) as distance_miles
FROM cities
WHERE state_or_province = 'TX'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
  AND (
    3959 * acos(
      cos(radians(29.5577)) * cos(radians(latitude)) *
      cos(radians(longitude) - radians(-95.8080)) +
      sin(radians(29.5577)) * sin(radians(latitude))
    )
  ) <= 75
ORDER BY distance_miles;

-- Step 2: If the above query shows cities with incorrect or null KMA codes, run this:
-- (Uncomment and run only if needed)

-- UPDATE cities
-- SET kma_code = 'TX_HOU', kma_name = 'Houston'
-- WHERE state_or_province = 'TX'
--   AND latitude IS NOT NULL
--   AND longitude IS NOT NULL
--   AND (
--     3959 * acos(
--       cos(radians(29.5577)) * cos(radians(latitude)) *
--       cos(radians(longitude) - radians(-95.8080)) +
--       sin(radians(29.5577)) * sin(radians(latitude))
--     )
--   ) <= 75;

-- Step 3: If cities are missing entirely, add major Houston area cities
-- (Common Houston-area cities that should exist)

-- First, update any existing Houston-area cities to have correct KMA
UPDATE cities
SET kma_code = 'TX_HOU', kma_name = 'Houston'
WHERE city IN ('Houston', 'Sugar Land', 'Katy', 'Pearland', 'Pasadena', 'Missouri City', 
               'League City', 'Baytown', 'Spring', 'Conroe', 'Humble', 'Cypress', 
               'Friendswood', 'Stafford', 'Richmond')
  AND state_or_province = 'TX';

-- Then insert any that don't exist
INSERT INTO cities (city, state_or_province, zip, latitude, longitude, kma_code, kma_name)
SELECT * FROM (VALUES
  ('Houston', 'TX', '77002', 29.7604, -95.3698, 'TX_HOU', 'Houston'),
  ('Sugar Land', 'TX', '77478', 29.6196, -95.6349, 'TX_HOU', 'Houston'),
  ('Katy', 'TX', '77449', 29.7858, -95.8244, 'TX_HOU', 'Houston'),
  ('Pearland', 'TX', '77581', 29.5635, -95.2861, 'TX_HOU', 'Houston'),
  ('Pasadena', 'TX', '77502', 29.6911, -95.2091, 'TX_HOU', 'Houston'),
  ('Missouri City', 'TX', '77459', 29.6185, -95.5377, 'TX_HOU', 'Houston'),
  ('League City', 'TX', '77573', 29.5074, -95.0949, 'TX_HOU', 'Houston'),
  ('Baytown', 'TX', '77520', 29.7355, -94.9774, 'TX_HOU', 'Houston'),
  ('Spring', 'TX', '77373', 30.0799, -95.4171, 'TX_HOU', 'Houston'),
  ('Conroe', 'TX', '77301', 30.3119, -95.4560, 'TX_HOU', 'Houston'),
  ('Humble', 'TX', '77338', 29.9988, -95.2621, 'TX_HOU', 'Houston'),
  ('Cypress', 'TX', '77429', 29.9691, -95.6972, 'TX_HOU', 'Houston'),
  ('Friendswood', 'TX', '77546', 29.5294, -95.2010, 'TX_HOU', 'Houston'),
  ('Stafford', 'TX', '77477', 29.6161, -95.5577, 'TX_HOU', 'Houston'),
  ('Richmond', 'TX', '77469', 29.5819, -95.7608, 'TX_HOU', 'Houston')
) AS v(city, state_or_province, zip, latitude, longitude, kma_code, kma_name)
WHERE NOT EXISTS (
  SELECT 1 FROM cities c 
  WHERE c.city = v.city 
    AND c.state_or_province = v.state_or_province 
    AND c.zip = v.zip
);
