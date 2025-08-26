-- Create dat_maps table for automated DAT market data fetching
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS dat_maps (
  id BIGSERIAL PRIMARY KEY,
  effective_date DATE NOT NULL,
  equipment TEXT NOT NULL,
  image_path TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(effective_date, equipment)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_dat_maps_equipment ON dat_maps(equipment);
CREATE INDEX IF NOT EXISTS idx_dat_maps_effective_date ON dat_maps(effective_date DESC);

-- Enable Row Level Security
ALTER TABLE dat_maps ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated users
CREATE POLICY IF NOT EXISTS "dat_maps_read_policy" ON dat_maps
  FOR SELECT USING (true);

-- Allow insert/update for service role (automation)
CREATE POLICY IF NOT EXISTS "dat_maps_write_policy" ON dat_maps
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR auth.role() = 'service_role');

-- Insert sample/test data to verify the structure
INSERT INTO dat_maps (effective_date, equipment, image_path, summary) VALUES
  (CURRENT_DATE, 'van', 'sample/van.png', 'Strong van demand nationwide with balanced capacity'),
  (CURRENT_DATE, 'reefer', 'sample/reefer.png', 'Reefer rates elevated due to produce season'),
  (CURRENT_DATE, 'flatbed', 'sample/flatbed.png', 'Flatbed capacity tight in industrial corridors')
ON CONFLICT (effective_date, equipment) DO UPDATE SET
  summary = EXCLUDED.summary,
  created_at = NOW();

-- Verify the structure
SELECT 
  table_name, 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'dat_maps' 
ORDER BY ordinal_position;
