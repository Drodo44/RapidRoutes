-- Create dat_maps table for market heat map data
-- Run this in Supabase SQL editor

CREATE TABLE IF NOT EXISTS dat_maps (
  id BIGSERIAL PRIMARY KEY,
  equipment_type TEXT UNIQUE NOT NULL,
  map_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dat_maps_equipment ON dat_maps(equipment_type);
CREATE INDEX IF NOT EXISTS idx_dat_maps_updated ON dat_maps(updated_at);

-- Enable RLS
ALTER TABLE dat_maps ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations for authenticated users
CREATE POLICY "dat_maps_policy" ON dat_maps
  FOR ALL USING (auth.role() = 'authenticated');

-- Insert sample data
INSERT INTO dat_maps (equipment_type, map_data) VALUES
('dry-van', '{"avgRate": "$2.45", "loadVolume": "15,234", "truckVolume": "12,891", "hotMarkets": ["Atlanta, GA", "Dallas, TX", "Chicago, IL"], "lastUpdated": "2025-08-25T00:00:00Z"}'),
('reefer', '{"avgRate": "$2.89", "loadVolume": "8,567", "truckVolume": "6,234", "hotMarkets": ["Fresno, CA", "Miami, FL", "McAllen, TX"], "lastUpdated": "2025-08-25T00:00:00Z"}'),
('flatbed', '{"avgRate": "$2.76", "loadVolume": "6,891", "truckVolume": "5,432", "hotMarkets": ["Houston, TX", "Pittsburgh, PA", "Birmingham, AL"], "lastUpdated": "2025-08-25T00:00:00Z"}')
ON CONFLICT (equipment_type) DO NOTHING;
