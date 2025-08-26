-- Create dat_maps table for DAT market data automation
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS dat_maps (
  id SERIAL PRIMARY KEY,
  effective_date DATE NOT NULL,
  equipment VARCHAR(20) NOT NULL,
  image_path TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(effective_date, equipment)
);

-- Enable Row Level Security
ALTER TABLE dat_maps ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Public read access" ON dat_maps
  FOR SELECT TO authenticated USING (true);

-- Allow full access to service role (for automation)
CREATE POLICY "Service role full access" ON dat_maps
  FOR ALL TO service_role USING (true);

-- Create index for faster queries
CREATE INDEX idx_dat_maps_date_equipment ON dat_maps(effective_date, equipment);
CREATE INDEX idx_dat_maps_created_at ON dat_maps(created_at DESC);
