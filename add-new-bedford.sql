-- Add New Bedford, MA to cities database
INSERT INTO cities (
  city, 
  state_or_province, 
  zip, 
  latitude, 
  longitude, 
  kma_code, 
  kma_name
) VALUES (
  'New Bedford', 
  'MA', 
  '02745', 
  41.6362, 
  -70.9342, 
  'BOS', 
  'Boston Market'
) ON CONFLICT DO NOTHING;

-- Verify it was added
SELECT * FROM cities WHERE city = 'New Bedford' AND state_or_province = 'MA';
