-- RapidRoutes Carrier & Lane Intelligence Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CARRIER COVERAGE TABLE
-- Tracks when lanes are covered (historical data)
-- ============================================
CREATE TABLE IF NOT EXISTS carrier_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID REFERENCES lanes(id) ON DELETE SET NULL,
  
  -- Route info (denormalized for history even if lane deleted)
  origin_city VARCHAR(100),
  origin_state VARCHAR(10),
  dest_city VARCHAR(100),
  dest_state VARCHAR(10),
  
  -- Carrier info
  mc_number VARCHAR(20) NOT NULL,
  carrier_email VARCHAR(255),
  carrier_name VARCHAR(255),
  
  -- Coverage details
  rate_covered DECIMAL(10,2) NOT NULL,
  covered_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_carrier_coverage_lane ON carrier_coverage(lane_id);
CREATE INDEX IF NOT EXISTS idx_carrier_coverage_mc ON carrier_coverage(mc_number);
CREATE INDEX IF NOT EXISTS idx_carrier_coverage_route ON carrier_coverage(origin_city, dest_city);
CREATE INDEX IF NOT EXISTS idx_carrier_coverage_org ON carrier_coverage(organization_id);

-- RLS policies
ALTER TABLE carrier_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org carrier coverage"
  ON carrier_coverage FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert carrier coverage"
  ON carrier_coverage FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================
-- 2. CARRIER OFFERS TABLE  
-- Tracks rate offers received from carriers
-- ============================================
CREATE TABLE IF NOT EXISTS carrier_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID REFERENCES lanes(id) ON DELETE CASCADE,
  
  mc_number VARCHAR(20) NOT NULL,
  rate_offered DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID
);

CREATE INDEX IF NOT EXISTS idx_carrier_offers_lane ON carrier_offers(lane_id);
CREATE INDEX IF NOT EXISTS idx_carrier_offers_mc ON carrier_offers(mc_number);

ALTER TABLE carrier_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org carrier offers"
  ON carrier_offers FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert carrier offers"
  ON carrier_offers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their org carrier offers"
  ON carrier_offers FOR DELETE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- ============================================
-- 3. LANES TABLE UPDATES
-- Add columns for gave_back tracking and priority
-- ============================================
ALTER TABLE lanes ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT FALSE;
ALTER TABLE lanes ADD COLUMN IF NOT EXISTS gave_back_at TIMESTAMPTZ;
ALTER TABLE lanes ADD COLUMN IF NOT EXISTS gave_back_reason TEXT;
ALTER TABLE lanes ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

-- Update posted_at for existing lanes that don't have it
UPDATE lanes 
SET posted_at = created_at 
WHERE posted_at IS NULL AND saved_origin_cities IS NOT NULL;


-- ============================================
-- 4. HELPER VIEW: Carriers who've run similar lanes
-- ============================================
CREATE OR REPLACE VIEW carrier_lane_history AS
SELECT 
  cc.origin_city,
  cc.origin_state,
  cc.dest_city,
  cc.dest_state,
  cc.mc_number,
  cc.carrier_email,
  cc.rate_covered,
  cc.covered_at,
  COUNT(*) OVER (PARTITION BY cc.mc_number, cc.origin_city, cc.dest_city) as times_run,
  cc.organization_id
FROM carrier_coverage cc;
