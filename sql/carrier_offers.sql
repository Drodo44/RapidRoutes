-- carrier_offers table for tracking rate offers from carriers
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS carrier_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID REFERENCES lanes(id) ON DELETE CASCADE,
  mc_number VARCHAR(20) NOT NULL,
  rate_offered DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Index for faster lookups by lane
CREATE INDEX IF NOT EXISTS idx_carrier_offers_lane ON carrier_offers(lane_id);

-- Index for looking up offers by MC number
CREATE INDEX IF NOT EXISTS idx_carrier_offers_mc ON carrier_offers(mc_number);

-- RLS policies
ALTER TABLE carrier_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own carrier offers"
  ON carrier_offers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own carrier offers"
  ON carrier_offers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own carrier offers"
  ON carrier_offers FOR DELETE
  USING (auth.uid() = user_id);
