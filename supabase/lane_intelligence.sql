-- Smart Lane Performance Tracking
-- This should be run in Supabase SQL editor to enable intelligence features

-- Table to track lane posting performance
CREATE TABLE IF NOT EXISTS lane_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lane_id UUID REFERENCES lanes(id) ON DELETE CASCADE,
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    equipment_code TEXT NOT NULL,
    origin_city TEXT NOT NULL,
    origin_state TEXT NOT NULL,
    dest_city TEXT NOT NULL, 
    dest_state TEXT NOT NULL,
    crawl_cities JSONB, -- Store the generated crawl cities for analysis
    success_metrics JSONB DEFAULT '{}', -- Store metrics like response_count, booking_time, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track individual crawl city performance  
CREATE TABLE IF NOT EXISTS crawl_city_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lane_performance_id UUID REFERENCES lane_performance(id) ON DELETE CASCADE,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    kma_code TEXT,
    position_type TEXT CHECK (position_type IN ('pickup', 'delivery')),
    intelligence_score DECIMAL(3,2), -- The score assigned by our algorithm
    actual_performance JSONB DEFAULT '{}', -- Track actual results
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lane_performance_equipment ON lane_performance(equipment_code);
CREATE INDEX IF NOT EXISTS idx_lane_performance_route ON lane_performance(origin_city, origin_state, dest_city, dest_state);
CREATE INDEX IF NOT EXISTS idx_crawl_city_performance_city ON crawl_city_performance(city, state, kma_code);
CREATE INDEX IF NOT EXISTS idx_crawl_city_performance_score ON crawl_city_performance(intelligence_score DESC);

-- RLS policies (if using Row Level Security)
ALTER TABLE lane_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_city_performance ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (adjust as needed)
CREATE POLICY "Enable all operations for authenticated users" ON lane_performance
    FOR ALL USING (auth.role() = 'authenticated');
    
CREATE POLICY "Enable all operations for authenticated users" ON crawl_city_performance  
    FOR ALL USING (auth.role() = 'authenticated');

-- Views for intelligence analysis
CREATE OR REPLACE VIEW equipment_city_intelligence AS
SELECT 
    equipment_code,
    city,
    state,
    position_type,
    COUNT(*) as times_used,
    AVG(intelligence_score) as avg_intelligence_score,
    -- Add actual performance metrics when available
    jsonb_agg(actual_performance) as performance_history
FROM lane_performance lp
JOIN crawl_city_performance ccp ON lp.id = ccp.lane_performance_id  
GROUP BY equipment_code, city, state, position_type
ORDER BY times_used DESC, avg_intelligence_score DESC;

-- Function to get top performing cities for an equipment type
CREATE OR REPLACE FUNCTION get_top_cities_for_equipment(
    p_equipment TEXT,
    p_position_type TEXT DEFAULT 'pickup',
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    city TEXT,
    state TEXT,
    avg_score DECIMAL,
    usage_count BIGINT
)
LANGUAGE sql
AS $$
    SELECT 
        eic.city,
        eic.state,
        eic.avg_intelligence_score,
        eic.times_used
    FROM equipment_city_intelligence eic
    WHERE eic.equipment_code = p_equipment 
    AND eic.position_type = p_position_type
    ORDER BY eic.avg_intelligence_score DESC, eic.times_used DESC
    LIMIT p_limit;
$$;
