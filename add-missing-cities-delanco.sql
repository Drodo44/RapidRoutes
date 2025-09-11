-- Add Delanco, NJ and other missing Philadelphia KMA cities
-- Based on user report that Delanco, NJ (08075) was not found

INSERT INTO cities (city, state_or_province, zip, latitude, longitude, kma_code, kma_name)
VALUES 
  -- Delanco, NJ - Philadelphia KMA
  ('Delanco', 'NJ', '08075', 40.0465, -74.9532, 'PHL', 'Philadelphia'),
  
  -- Other common Philadelphia KMA cities that might be missing
  ('Riverside', 'NJ', '08075', 40.0342, -74.9568, 'PHL', 'Philadelphia'),
  ('Palmyra', 'NJ', '08065', 40.0070, -75.0344, 'PHL', 'Philadelphia'),
  ('Beverly', 'NJ', '08010', 40.0659, -74.9276, 'PHL', 'Philadelphia'),
  ('Edgewater Park', 'NJ', '08010', 40.0543, -74.9065, 'PHL', 'Philadelphia'),
  ('Burlington', 'NJ', '08016', 40.0712, -74.8648, 'PHL', 'Philadelphia'),
  
  -- Some missing NC cities based on previous Seaboard searches
  ('Seaboard', 'NC', '27876', 36.4876, -77.4319, 'RDU', 'Raleigh-Durham'),
  ('Conway', 'NC', '27820', 36.4365, -77.1180, 'RDU', 'Raleigh-Durham'),
  ('Rich Square', 'NC', '27869', 36.2737, -77.2858, 'RDU', 'Raleigh-Durham')

ON CONFLICT (city, state_or_province, zip) DO NOTHING;
