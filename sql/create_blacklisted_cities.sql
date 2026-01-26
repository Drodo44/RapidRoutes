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
