-- =============================================================================
-- LANE CITY CHOICES TABLE
-- =============================================================================
-- Stores broker's manually chosen cities for each lane (origin and destination)
-- Enables:
-- - Memory of past choices (auto-fill for repeat lanes)
-- - Tracking which cities were actually posted
-- - Clean separation of lane data from posting choices
-- =============================================================================

CREATE TABLE IF NOT EXISTS lane_city_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID REFERENCES lanes(id) ON DELETE CASCADE,
  
  -- Origin choices
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL,
  origin_chosen_cities JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Destination choices  
  dest_city TEXT NOT NULL,
  dest_state TEXT NOT NULL,
  dest_chosen_cities JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  posted_cities JSONB DEFAULT '[]'::jsonb,
  rr_number TEXT, -- Format: RR + 5 random digits (e.g., RR12341, RR98234)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one choice set per lane
  UNIQUE(lane_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_lane_choices_lane ON lane_city_choices(lane_id);
CREATE INDEX IF NOT EXISTS idx_lane_choices_origin ON lane_city_choices(origin_city, origin_state);
CREATE INDEX IF NOT EXISTS idx_lane_choices_dest ON lane_city_choices(dest_city, dest_state);
CREATE INDEX IF NOT EXISTS idx_lane_choices_rr ON lane_city_choices(rr_number);

-- Function to generate random 5-digit RR number (10000-99999 range)
-- No leading zeros, randomized to avoid sequential patterns
CREATE OR REPLACE FUNCTION get_next_rr_number()
RETURNS TEXT AS $$
DECLARE
  random_num INT;
  new_rr TEXT;
  exists_check INT;
BEGIN
  -- Loop until we find a unique random number
  LOOP
    -- Generate random 5-digit number (10000 to 99999)
    random_num := floor(random() * 90000 + 10000)::INT;
    new_rr := 'RR' || random_num::TEXT;
    
    -- Check if this RR number already exists
    SELECT COUNT(*) INTO exists_check
    FROM lane_city_choices
    WHERE rr_number = new_rr;
    
    -- If unique, return it
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN new_rr;
END;
$$ LANGUAGE plpgsql;

-- Example structure for chosen_cities JSONB:
-- [
--   {
--     "city": "Fitzgerald",
--     "state": "GA",
--     "kma_code": "ATL",
--     "kma_name": "Atlanta",
--     "miles": 0,
--     "posted": true
--   },
--   ...
-- ]

-- Note: RR numbers are random 5-digit numbers (RR12341, RR98234, RR45672...)
-- Range: 10000-99999 (no leading zeros)
-- Randomized to avoid sequential patterns for DAT platform
