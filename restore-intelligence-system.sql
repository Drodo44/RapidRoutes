-- RapidRoutes Intelligence System Restoration
-- Add missing columns for HERE.com integration and KMA cross-referencing
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Add HERE.com verification and discovery tracking columns
ALTER TABLE cities ADD COLUMN IF NOT EXISTS here_verified BOOLEAN DEFAULT false;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS discovered_by VARCHAR(50);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS discovery_date TIMESTAMPTZ;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS here_confidence DECIMAL(3,2);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS kma_verified BOOLEAN DEFAULT false;

-- 2. Create index for performance on HERE.com verified cities
CREATE INDEX IF NOT EXISTS idx_cities_here_verified ON cities(here_verified, kma_code);
CREATE INDEX IF NOT EXISTS idx_cities_discovery ON cities(discovered_by, discovery_date);

-- 3. Update existing cities that match HERE.com patterns to be verified
UPDATE cities 
SET here_verified = true, 
    kma_verified = true,
    discovered_by = 'initial_dataset'
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND kma_code IS NOT NULL;

-- 4. Create HERE.com discovery log table for tracking
CREATE TABLE IF NOT EXISTS here_discovery_log (
  id SERIAL PRIMARY KEY,
  city_name VARCHAR(100) NOT NULL,
  state_name VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(11, 7),
  kma_assigned VARCHAR(10),
  verification_status VARCHAR(20),
  discovery_context VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create KMA assignment tracking for HERE.com discoveries
CREATE TABLE IF NOT EXISTS kma_assignments (
  id SERIAL PRIMARY KEY,
  city_id INTEGER REFERENCES cities(id),
  original_kma VARCHAR(10),
  assigned_kma VARCHAR(10),
  assignment_reason VARCHAR(200),
  confidence_score DECIMAL(3,2),
  verified_by VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Add RLS policies for the new tables (if RLS is enabled)
ALTER TABLE here_discovery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE kma_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies that allow full access for now
CREATE POLICY "Allow full access to here_discovery_log" ON here_discovery_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow full access to kma_assignments" ON kma_assignments  
  FOR ALL USING (true) WITH CHECK (true);

-- 7. Create view for intelligence system queries
CREATE OR REPLACE VIEW intelligent_cities AS
SELECT 
  c.*,
  CASE 
    WHEN c.here_verified = true AND c.kma_verified = true THEN 'verified'
    WHEN c.here_verified = true THEN 'here_confirmed'
    WHEN c.kma_code IS NOT NULL THEN 'database_existing'
    ELSE 'unverified'
  END as verification_status,
  COALESCE(c.here_confidence, 0.85) as intelligence_confidence
FROM cities c
WHERE c.latitude IS NOT NULL 
  AND c.longitude IS NOT NULL;

-- 8. Verify the setup
SELECT 
  COUNT(*) as total_cities,
  COUNT(*) FILTER (WHERE here_verified = true) as here_verified_cities,
  COUNT(*) FILTER (WHERE kma_code IS NOT NULL) as cities_with_kma,
  COUNT(DISTINCT kma_code) as unique_kmas
FROM cities;

-- Show sample of restored data
SELECT city, state_or_province, kma_code, here_verified, discovered_by
FROM cities 
WHERE kma_code IS NOT NULL 
ORDER BY here_verified DESC, city 
LIMIT 10;
