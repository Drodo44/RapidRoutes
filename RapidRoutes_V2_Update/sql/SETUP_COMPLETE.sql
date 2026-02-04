-- ============================================
-- RapidRoutes Database Setup Script
-- Run this in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. BLACKLISTED CITIES TABLE
-- ============================================

-- Create blacklisted_cities table for user-managed city exclusions
CREATE TABLE IF NOT EXISTS blacklisted_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  reason TEXT,
  blacklisted_by UUID REFERENCES auth.users(id),
  blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(city, state)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_blacklisted_cities_lookup ON blacklisted_cities(city, state);

-- Enable RLS
ALTER TABLE blacklisted_cities ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anyone can view blacklisted cities" ON blacklisted_cities;
DROP POLICY IF EXISTS "Authenticated users can blacklist cities" ON blacklisted_cities;
DROP POLICY IF EXISTS "Authenticated users can remove blacklisted cities" ON blacklisted_cities;

-- Policy: All authenticated users can view blacklisted cities
CREATE POLICY "Anyone can view blacklisted cities" ON blacklisted_cities
  FOR SELECT
  USING (true);

-- Policy: All authenticated users can add to blacklist
CREATE POLICY "Authenticated users can blacklist cities" ON blacklisted_cities
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy: All authenticated users can remove from blacklist
CREATE POLICY "Authenticated users can remove blacklisted cities" ON blacklisted_cities
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON blacklisted_cities TO authenticated;
GRANT SELECT ON blacklisted_cities TO anon;


-- ============================================
-- 2. CITY PERFORMANCE TRACKING TABLE
-- ============================================

-- Create city_performance table to track which cities generate leads
CREATE TABLE IF NOT EXISTS city_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  city_type TEXT CHECK (city_type IN ('pickup', 'delivery')),
  contact_method TEXT CHECK (contact_method IN ('email', 'phone', 'unknown')),
  contact_received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reference_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_city_performance_city ON city_performance(city, state);
CREATE INDEX IF NOT EXISTS idx_city_performance_lane ON city_performance(lane_id);
CREATE INDEX IF NOT EXISTS idx_city_performance_date ON city_performance(contact_received_at);
CREATE INDEX IF NOT EXISTS idx_city_performance_ref ON city_performance(reference_id);

-- Enable RLS
ALTER TABLE city_performance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view city performance" ON city_performance;
DROP POLICY IF EXISTS "Authenticated users can log performance" ON city_performance;

-- Policies
CREATE POLICY "Anyone can view city performance" ON city_performance
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can log performance" ON city_performance
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT, INSERT ON city_performance TO authenticated;
GRANT SELECT ON city_performance TO anon;

-- Create view for city statistics
DROP VIEW IF EXISTS city_performance_stats;
CREATE OR REPLACE VIEW city_performance_stats AS
SELECT 
  city,
  state,
  city_type,
  COUNT(*) as total_contacts,
  COUNT(CASE WHEN contact_method = 'email' THEN 1 END) as email_contacts,
  COUNT(CASE WHEN contact_method = 'phone' THEN 1 END) as phone_contacts,
  MAX(contact_received_at) as last_contact,
  COUNT(DISTINCT COALESCE(lane_id, 'unknown')) as unique_lanes
FROM city_performance
GROUP BY city, state, city_type
ORDER BY total_contacts DESC;

GRANT SELECT ON city_performance_stats TO authenticated, anon;

-- ============================================
-- SETUP COMPLETE
-- ============================================
-- You can now use the blacklist management in Settings
-- and start tracking city performance data!
