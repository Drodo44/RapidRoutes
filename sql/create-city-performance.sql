-- Create city_performance table for Smart City Learning
-- Tracks which cities successfully cover loads via IBC/OBC/Email

CREATE TABLE IF NOT EXISTS city_performance (
  id BIGSERIAL PRIMARY KEY,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  kma TEXT,
  covers_total INT DEFAULT 0,
  covers_ibc INT DEFAULT 0,
  covers_obc INT DEFAULT 0,
  covers_email INT DEFAULT 0,
  last_success TIMESTAMP DEFAULT NOW(),
  is_starred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(city, state)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_city_performance_starred ON city_performance(is_starred);
CREATE INDEX IF NOT EXISTS idx_city_performance_city_state ON city_performance(city, state);

-- RLS Policies (enable for authenticated users)
ALTER TABLE city_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read city_performance"
  ON city_performance FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert city_performance"
  ON city_performance FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update city_performance"
  ON city_performance FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add coverage fields to lanes table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='lanes' AND column_name='coverage_source'
  ) THEN
    ALTER TABLE lanes ADD COLUMN coverage_source TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='lanes' AND column_name='lane_group_id'
  ) THEN
    ALTER TABLE lanes ADD COLUMN lane_group_id TEXT;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='lanes' AND column_name='rr_number'
  ) THEN
    ALTER TABLE lanes ADD COLUMN rr_number TEXT;
  END IF;
END $$;

-- Create index on rr_number for fast lookups
CREATE INDEX IF NOT EXISTS idx_lanes_rr_number ON lanes(rr_number);
CREATE INDEX IF NOT EXISTS idx_lanes_lane_group_id ON lanes(lane_group_id);
CREATE INDEX IF NOT EXISTS idx_lanes_coverage_source ON lanes(coverage_source);

COMMENT ON TABLE city_performance IS 'Tracks city coverage success metrics for Smart City Learning';
COMMENT ON COLUMN city_performance.is_starred IS 'Auto-starred when covers_ibc >= 5 OR covers_total >= 10';
