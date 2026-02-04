-- ============================================
-- RapidRoutes Database Setup - CLEAN INSTALL
-- This drops existing tables and recreates them
-- ============================================

-- Drop existing objects (in correct order)
DROP VIEW IF EXISTS city_performance_stats;
DROP TABLE IF EXISTS city_performance CASCADE;
DROP TABLE IF EXISTS blacklisted_cities CASCADE;

-- ============================================
-- 1. BLACKLISTED CITIES TABLE
-- ============================================

CREATE TABLE blacklisted_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  reason TEXT,
  blacklisted_by UUID REFERENCES auth.users(id),
  blacklisted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(city, state)
);

CREATE INDEX idx_blacklisted_cities_lookup ON blacklisted_cities(city, state);

ALTER TABLE blacklisted_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blacklisted cities" ON blacklisted_cities
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can blacklist cities" ON blacklisted_cities
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can remove blacklisted cities" ON blacklisted_cities
  FOR DELETE
  USING (auth.role() = 'authenticated');

GRANT SELECT, INSERT, DELETE ON blacklisted_cities TO authenticated;
GRANT SELECT ON blacklisted_cities TO anon;


-- ============================================
-- 2. CITY PERFORMANCE TRACKING TABLE
-- ============================================

CREATE TABLE city_performance (
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

CREATE INDEX idx_city_performance_city ON city_performance(city, state);
CREATE INDEX idx_city_performance_lane ON city_performance(lane_id);
CREATE INDEX idx_city_performance_date ON city_performance(contact_received_at);
CREATE INDEX idx_city_performance_ref ON city_performance(reference_id);

ALTER TABLE city_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view city performance" ON city_performance
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can log performance" ON city_performance
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

GRANT SELECT, INSERT ON city_performance TO authenticated;
GRANT SELECT ON city_performance TO anon;

-- Create view for city statistics
CREATE VIEW city_performance_stats AS
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
-- SETUP COMPLETE!
-- ============================================
