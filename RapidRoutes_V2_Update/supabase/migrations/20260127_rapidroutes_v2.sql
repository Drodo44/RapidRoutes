-- File: supabase/migrations/20260127_rapidroutes_v2.sql
-- RapidRoutes 2.0 Database Migration
-- Date: 2026-01-27
-- Purpose: Create tables for Lane Command Center, Smart Archive, and Market Calibration features
-- 
-- CRITICAL CONSTRAINTS:
-- 1. dat_loads_2025 is READ-ONLY - no modifications
-- 2. All changes are ADDITIVE ONLY - no altering existing columns
-- 3. New tables: load_interactions, covered_loads, market_conditions

-- =============================================================================
-- PART 1: Helper Functions
-- =============================================================================

-- Function to map US state codes to regional market zones
CREATE OR REPLACE FUNCTION get_region_for_state(state_code TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    -- Northeast: New England + Mid-Atlantic
    WHEN state_code IN ('ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA') 
      THEN 'northeast'
    -- Southeast: South Atlantic + East South Central
    WHEN state_code IN ('DE', 'MD', 'VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'TN', 'KY', 'DC') 
      THEN 'southeast'
    -- Midwest: East North Central + West North Central
    WHEN state_code IN ('OH', 'IN', 'IL', 'MI', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS') 
      THEN 'midwest'
    -- Southwest: West South Central + Arizona/New Mexico
    WHEN state_code IN ('TX', 'OK', 'AR', 'LA', 'NM', 'AZ') 
      THEN 'southwest'
    -- West: Mountain + Pacific
    WHEN state_code IN ('CO', 'UT', 'NV', 'CA', 'OR', 'WA', 'ID', 'MT', 'WY', 'AK', 'HI') 
      THEN 'west'
    -- Default fallback for unknown/Canadian provinces
    ELSE 'midwest'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_region_for_state(TEXT) IS 
  'Maps US state codes to one of 5 regional market zones for rate calibration';

-- =============================================================================
-- PART 2: market_conditions Table
-- Stores regional spot rates and multipliers for live rate adjustment
-- =============================================================================

CREATE TABLE IF NOT EXISTS market_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Region Identification (constrained to 5 valid regions)
  region TEXT NOT NULL UNIQUE CHECK (region IN (
    'northeast', 'southeast', 'midwest', 'southwest', 'west'
  )),
  
  -- Current Market Rate (input by admin from weekly rate map)
  current_spot_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Historical average calculated from dat_loads_2025
  historical_avg_rate DECIMAL(10, 2) DEFAULT 0,
  
  -- Computed multiplier: current_spot_rate / historical_avg_rate
  -- Used to adjust historical rates to "live" rates
  rate_multiplier DECIMAL(5, 3) DEFAULT 1.000,
  
  -- Reference to uploaded rate map image
  rate_map_image_url TEXT,
  
  -- Admin tracking
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed the 5 regions with default values
INSERT INTO market_conditions (region, current_spot_rate, historical_avg_rate, rate_multiplier)
VALUES 
  ('northeast', 0, 0, 1.000),
  ('southeast', 0, 0, 1.000),
  ('midwest', 0, 0, 1.000),
  ('southwest', 0, 0, 1.000),
  ('west', 0, 0, 1.000)
ON CONFLICT (region) DO NOTHING;

-- RLS Policies for market_conditions
ALTER TABLE market_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_conditions_select_policy"
    ON market_conditions FOR SELECT
    USING (true);

CREATE POLICY "market_conditions_update_policy"
    ON market_conditions FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'Admin'
      )
    );

COMMENT ON TABLE market_conditions IS 
  'Regional market rate calibration for live rate adjustments on historical dat_loads_2025 data';

-- =============================================================================
-- PART 3: covered_loads Table
-- Carrier Memory - tracks who covered which lanes for Smart Archive
-- =============================================================================

CREATE TABLE IF NOT EXISTS covered_loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lane reference
  lane_id UUID NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
  covered_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Carrier Information (required when marking as covered)
  carrier_mc TEXT NOT NULL,
  carrier_name TEXT NOT NULL,
  carrier_phone TEXT,
  carrier_email TEXT,
  carrier_pay_rate DECIMAL(10, 2),
  
  -- Lane Snapshot (preserved for historical Carrier Memory lookups)
  origin_city TEXT,
  origin_state TEXT,
  destination_city TEXT,
  destination_state TEXT,
  bill_rate DECIMAL(10, 2),
  
  -- Calculated margin fields
  margin_amount DECIMAL(10, 2),
  margin_percent DECIMAL(5, 2),
  
  -- Timestamps
  covered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for Carrier Memory lookups
CREATE INDEX IF NOT EXISTS idx_covered_loads_lane ON covered_loads(lane_id);
CREATE INDEX IF NOT EXISTS idx_covered_loads_carrier_mc ON covered_loads(carrier_mc);
CREATE INDEX IF NOT EXISTS idx_covered_loads_covered_at ON covered_loads(covered_at DESC);

-- Composite index for lane pattern matching (Carrier Memory feature)
CREATE INDEX IF NOT EXISTS idx_covered_loads_lane_pattern 
    ON covered_loads(origin_city, origin_state, destination_city, destination_state);

-- RLS Policies for covered_loads
ALTER TABLE covered_loads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "covered_loads_select_policy"
    ON covered_loads FOR SELECT
    USING (true);

CREATE POLICY "covered_loads_insert_policy"
    ON covered_loads FOR INSERT
    WITH CHECK (auth.uid() = covered_by_user_id);

COMMENT ON TABLE covered_loads IS 
  'Carrier coverage history for Smart Archive workflow - enables Carrier Memory feature';

-- =============================================================================
-- PART 4: load_interactions Table
-- Enhanced tracking for Traction Tracker (call/email logging)
-- =============================================================================

CREATE TABLE IF NOT EXISTS load_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lane and user references
  lane_id UUID NOT NULL REFERENCES lanes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Interaction Type (call or email)
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('call', 'email')),
  
  -- Carrier Details (optional - filled when carrier responds)
  carrier_mc TEXT,
  carrier_name TEXT,
  carrier_phone TEXT,
  carrier_email TEXT,
  
  -- Outcome Tracking
  outcome TEXT CHECK (outcome IN ('no_answer', 'interested', 'declined', 'booked', 'pending')),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for Traction Tracker queries
CREATE INDEX IF NOT EXISTS idx_load_interactions_lane ON load_interactions(lane_id);
CREATE INDEX IF NOT EXISTS idx_load_interactions_user ON load_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_load_interactions_type ON load_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_load_interactions_created ON load_interactions(created_at DESC);

-- RLS Policies for load_interactions
ALTER TABLE load_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "load_interactions_select_policy"
    ON load_interactions FOR SELECT
    USING (true);

CREATE POLICY "load_interactions_insert_policy"
    ON load_interactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "load_interactions_update_policy"
    ON load_interactions FOR UPDATE
    USING (auth.uid() = user_id);

COMMENT ON TABLE load_interactions IS 
  'Traction Tracker - logs call and email interactions per lane with carrier details';

-- =============================================================================
-- PART 5: Modify lanes Table (ADDITIVE ONLY)
-- Add new columns for Command Center features
-- =============================================================================

-- Add last_covered_load_id for Carrier Memory quick lookup
ALTER TABLE lanes 
ADD COLUMN IF NOT EXISTS last_covered_load_id UUID REFERENCES covered_loads(id);

-- Add bill_rate for margin calculation
ALTER TABLE lanes 
ADD COLUMN IF NOT EXISTS bill_rate DECIMAL(10, 2);

-- Add deadhead columns for Map Widget
ALTER TABLE lanes 
ADD COLUMN IF NOT EXISTS deadhead_miles INTEGER;

ALTER TABLE lanes 
ADD COLUMN IF NOT EXISTS deadhead_time_hours DECIMAL(5, 2);

-- Add comments for documentation
COMMENT ON COLUMN lanes.last_covered_load_id IS 
  'Reference to most recent coverage for Carrier Memory feature';
COMMENT ON COLUMN lanes.bill_rate IS 
  'Customer bill rate for margin calculation in Command Center';
COMMENT ON COLUMN lanes.deadhead_miles IS 
  'Distance to pickup location for Map Widget';
COMMENT ON COLUMN lanes.deadhead_time_hours IS 
  'Calculated: deadhead_miles / 55mph for Map Widget display';

-- =============================================================================
-- PART 6: Create trigger for updated_at on load_interactions
-- =============================================================================

CREATE OR REPLACE FUNCTION update_load_interactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_load_interactions_updated_at ON load_interactions;
CREATE TRIGGER trigger_load_interactions_updated_at
  BEFORE UPDATE ON load_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_load_interactions_updated_at();

-- =============================================================================
-- VERIFICATION QUERIES (run these to confirm migration success)
-- =============================================================================

-- Check tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('market_conditions', 'covered_loads', 'load_interactions');

-- Check new columns on lanes:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'lanes' AND column_name IN ('last_covered_load_id', 'bill_rate', 'deadhead_miles', 'deadhead_time_hours');

-- Check function exists:
-- SELECT get_region_for_state('WA'); -- Should return 'west'
-- SELECT get_region_for_state('NY'); -- Should return 'northeast'
-- SELECT get_region_for_state('TX'); -- Should return 'southwest'

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
