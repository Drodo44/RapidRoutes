-- Create the core freight intelligence table
CREATE TABLE IF NOT EXISTS freight_intelligence (
    id SERIAL PRIMARY KEY,
    city_pair_hash TEXT UNIQUE,  -- Unique identifier for city pair (format: ORIGINCITY_ORIGSTATE_DESTCITY_DESTSTATE)
    origin_data JSONB,           -- Full origin city details including surrounding cities
    dest_data JSONB,             -- Full destination city details including surrounding cities
    equipment_patterns JSONB DEFAULT '{"FD": 0, "V": 0, "R": 0}',  -- Track usage by equipment type
    usage_frequency INT DEFAULT 1,
    first_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    distance_miles FLOAT,
    states_crossed TEXT[],
    source TEXT DEFAULT 'HERE_API',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_freight_intelligence_city_pair ON freight_intelligence(city_pair_hash);
CREATE INDEX IF NOT EXISTS idx_freight_intelligence_usage ON freight_intelligence(usage_frequency DESC);
CREATE INDEX IF NOT EXISTS idx_freight_intelligence_equipment ON freight_intelligence USING GIN(equipment_patterns);

-- Add RLS policies
ALTER TABLE freight_intelligence ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY freight_intelligence_select ON freight_intelligence
    FOR SELECT TO authenticated
    USING (true);

-- Allow insert/update to authenticated users
CREATE POLICY freight_intelligence_insert ON freight_intelligence
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY freight_intelligence_update ON freight_intelligence
    FOR UPDATE TO authenticated
    USING (true);
