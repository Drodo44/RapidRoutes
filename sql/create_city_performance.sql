-- Create city_performance table to track which cities generate leads
CREATE TABLE IF NOT EXISTS city_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID REFERENCES lanes(id) ON DELETE CASCADE,
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
CREATE OR REPLACE VIEW city_performance_stats AS
SELECT 
  city,
  state,
  city_type,
  COUNT(*) as total_contacts,
  COUNT(CASE WHEN contact_method = 'email' THEN 1 END) as email_contacts,
  COUNT(CASE WHEN contact_method = 'phone' THEN 1 END) as phone_contacts,
  MAX(contact_received_at) as last_contact,
  COUNT(DISTINCT lane_id) as unique_lanes
FROM city_performance
GROUP BY city, state, city_type
ORDER BY total_contacts DESC;

GRANT SELECT ON city_performance_stats TO authenticated, anon;
