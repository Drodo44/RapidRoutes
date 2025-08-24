-- Create dat_maps table for market data functionality
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS dat_maps (
  id SERIAL PRIMARY KEY,
  effective_date DATE NOT NULL,
  equipment VARCHAR(10) NOT NULL,
  image_path TEXT NOT NULL,
  map_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dat_maps_equipment_date 
ON dat_maps (equipment, effective_date DESC);

-- Create index for latest maps
CREATE INDEX IF NOT EXISTS idx_dat_maps_latest 
ON dat_maps (effective_date DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE dat_maps ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON dat_maps
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert sample data for testing
INSERT INTO dat_maps (effective_date, equipment, image_path, map_data) VALUES
  ('2024-08-24', 'FD', '/maps/flatbed-weekly.png', '{"status": "active", "type": "weekly"}'),
  ('2024-08-24', 'V', '/maps/van-weekly.png', '{"status": "active", "type": "weekly"}'),
  ('2024-08-24', 'R', '/maps/reefer-weekly.png', '{"status": "active", "type": "weekly"}')
ON CONFLICT DO NOTHING;
