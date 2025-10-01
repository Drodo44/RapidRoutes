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
  rr_number TEXT, -- Simple format: RR12345
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

-- Function to get next RR number
CREATE OR REPLACE FUNCTION get_next_rr_number()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(rr_number FROM 3) AS INT)), 0) + 1
  INTO next_num
  FROM lane_city_choices
  WHERE rr_number ~ '^RR[0-9]+$';
  
  RETURN 'RR' || LPAD(next_num::TEXT, 5, '0');
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
