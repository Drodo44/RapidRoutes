-- Create preferred pickup locations table for individual broker intelligence
-- Each broker manages their own pickup preferences

CREATE TABLE IF NOT EXISTS preferred_pickups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Index for fast lookups by user and location
CREATE INDEX IF NOT EXISTS idx_preferred_pickups_user ON preferred_pickups(user_id);
CREATE INDEX IF NOT EXISTS idx_preferred_pickups_location ON preferred_pickups(city, state_or_province);
CREATE INDEX IF NOT EXISTS idx_preferred_pickups_kma ON preferred_pickups(kma_code);
CREATE INDEX IF NOT EXISTS idx_preferred_pickups_frequency ON preferred_pickups(frequency_score DESC);

-- RLS for security - users can only see their own pickups
ALTER TABLE preferred_pickups ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own pickups
CREATE POLICY "Users can manage their own pickups" ON preferred_pickups
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE preferred_pickups IS 'Individual broker preferred pickup locations for intelligent posting optimization';
