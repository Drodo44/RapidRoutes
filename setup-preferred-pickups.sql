-- Create preferred pickup locations table for broker intelligence
-- This stores the broker's most common pickup cities/KMAs for optimized posting

CREATE TABLE IF NOT EXISTS preferred_pickups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city TEXT NOT NULL,
    state_or_province TEXT NOT NULL,
    zip TEXT,
    kma_code TEXT,
    kma_name TEXT,
    frequency_score INTEGER DEFAULT 1, -- How often this pickup is used (1-10)
    equipment_preference TEXT[], -- Preferred equipment types for this pickup
    notes TEXT, -- Broker notes about this pickup location
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by city/state
CREATE INDEX IF NOT EXISTS idx_preferred_pickups_location ON preferred_pickups(city, state_or_province);
CREATE INDEX IF NOT EXISTS idx_preferred_pickups_kma ON preferred_pickups(kma_code);
CREATE INDEX IF NOT EXISTS idx_preferred_pickups_frequency ON preferred_pickups(frequency_score DESC);

-- RLS for security
ALTER TABLE preferred_pickups ENABLE ROW LEVEL SECURITY;

-- Policy to allow all operations for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON preferred_pickups
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Sample data - add your most common pickup cities
INSERT INTO preferred_pickups (city, state_or_province, zip, frequency_score, equipment_preference, notes) VALUES
('Atlanta', 'GA', '30309', 10, ARRAY['V', 'R', 'FD'], 'Major hub - high frequency'),
('Chicago', 'IL', '60601', 9, ARRAY['V', 'FD'], 'Midwest distribution center'),
('Dallas', 'TX', '75201', 9, ARRAY['V', 'FD', 'R'], 'Texas freight hub'),
('Los Angeles', 'CA', '90210', 8, ARRAY['V', 'R'], 'West coast gateway'),
('Charlotte', 'NC', '28202', 7, ARRAY['V', 'FD'], 'Southeast distribution'),
('Memphis', 'TN', '38101', 8, ARRAY['V'], 'Logistics hub'),
('Jacksonville', 'FL', '32099', 6, ARRAY['V', 'R'], 'Florida freight'),
('Phoenix', 'AZ', '85001', 6, ARRAY['V', 'FD'], 'Southwest hub'),
('Columbus', 'OH', '43215', 5, ARRAY['V'], 'Ohio logistics'),
('Kansas City', 'MO', '64108', 7, ARRAY['V', 'FD'], 'Central US hub')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE preferred_pickups IS 'Broker preferred pickup locations for intelligent posting optimization';
