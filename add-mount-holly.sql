-- Add Mount Holly, NJ to database
INSERT INTO cities (city, state_or_province, zip, latitude, longitude, kma_code, kma_name) VALUES
  ('Mount Holly', 'NJ', '08060', 39.9926, -74.7879, 'PHL', 'Philadelphia Market')
ON CONFLICT (city, state_or_province, zip) DO NOTHING;
