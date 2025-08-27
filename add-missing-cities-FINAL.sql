-- Add New Bedford, MA and other missing cities to database
-- Run this in your Supabase SQL editor

INSERT INTO cities (city, state_or_province, zip, latitude, longitude, kma_code, kma_name) VALUES
  ('New Bedford', 'MA', '02745', 41.6362, -70.9342, 'BOS', 'Boston Market'),
  ('Ostrander', 'OH', '43061', 40.2573, -83.2079, 'COL', 'Columbus Market'),
  ('Spring Grove', 'IN', '47374', 39.6745, -84.9036, 'CIN', 'Cincinnati Market'),
  ('Centerville', 'IN', '47330', 39.8203, -84.9644, 'CIN', 'Cincinnati Market')
ON CONFLICT (city, state_or_province, zip) DO NOTHING;

-- Verify they were added
SELECT city, state_or_province, zip, kma_code FROM cities 
WHERE city IN ('New Bedford', 'Ostrander', 'Spring Grove', 'Centerville') 
ORDER BY city;
