-- Create city_corrections table for managing DAT city name corrections
-- This allows brokers to correct city names that DAT rejects

CREATE TABLE IF NOT EXISTS city_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incorrect_city TEXT NOT NULL,
  incorrect_state TEXT NOT NULL,
  correct_city TEXT NOT NULL,
  correct_state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(incorrect_city, incorrect_state)
);

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_city_corrections_lookup 
ON city_corrections(incorrect_city, incorrect_state);

-- Insert initial known corrections
INSERT INTO city_corrections (incorrect_city, incorrect_state, correct_city, correct_state, notes)
VALUES 
  ('Sunny Side', 'GA', 'Sunnyside', 'GA', 'DAT rejected "Sunny Side" but accepted "Sunnyside"')
ON CONFLICT (incorrect_city, incorrect_state) DO NOTHING;

-- Enable RLS
ALTER TABLE city_corrections ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (corrections are applied automatically)
CREATE POLICY "Anyone can view city corrections" 
ON city_corrections FOR SELECT 
USING (true);

-- Allow insert/update/delete for authenticated users only
CREATE POLICY "Authenticated users can manage corrections" 
ON city_corrections FOR ALL 
USING (auth.role() = 'authenticated');

COMMENT ON TABLE city_corrections IS 'Maps incorrect city names to DAT-accepted corrections';
COMMENT ON COLUMN city_corrections.incorrect_city IS 'City name as it appears in database';
COMMENT ON COLUMN city_corrections.incorrect_state IS 'State code for incorrect city';
COMMENT ON COLUMN city_corrections.correct_city IS 'DAT-accepted city name';
COMMENT ON COLUMN city_corrections.correct_state IS 'DAT-accepted state code';
COMMENT ON COLUMN city_corrections.notes IS 'Optional notes about why correction is needed';
