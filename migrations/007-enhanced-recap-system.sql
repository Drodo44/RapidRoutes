-- Migration for enhanced recap system
-- Adds intelligent insights and better tracking

-- Enhance recaps table
ALTER TABLE recaps ADD COLUMN IF NOT EXISTS
    insights JSONB[];

-- Add generated_at timestamp
ALTER TABLE recaps ADD COLUMN IF NOT EXISTS
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Add indices for better performance
CREATE INDEX IF NOT EXISTS idx_recaps_lane_id ON recaps(lane_id);
CREATE INDEX IF NOT EXISTS idx_recaps_generated_at ON recaps(generated_at);

-- Create materialized view for recap analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS recap_analytics AS
SELECT 
    r.lane_id,
    l.origin_city,
    l.origin_state,
    l.dest_city,
    l.dest_state,
    l.equipment_code,
    COUNT(DISTINCT p.id) as total_postings,
    AVG(p.rate) as avg_rate,
    MIN(p.rate) as min_rate,
    MAX(p.rate) as max_rate,
    MIN(r.generated_at) as first_recap,
    MAX(r.generated_at) as last_recap
FROM recaps r
JOIN lanes l ON l.id = r.lane_id
LEFT JOIN postings p ON p.lane_id = r.lane_id
GROUP BY 
    r.lane_id,
    l.origin_city,
    l.origin_state,
    l.dest_city,
    l.dest_state,
    l.equipment_code;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_recap_analytics_lane_id 
ON recap_analytics(lane_id);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_recap_analytics()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY recap_analytics;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh the materialized view
DROP TRIGGER IF EXISTS refresh_recap_analytics ON recaps;
CREATE TRIGGER refresh_recap_analytics
    AFTER INSERT OR UPDATE OR DELETE ON recaps
    FOR EACH STATEMENT
    EXECUTE FUNCTION refresh_recap_analytics();

-- Function to generate intelligent insights
CREATE OR REPLACE FUNCTION generate_recap_insights(lane_id UUID)
RETURNS JSONB[] AS $$
DECLARE
    insights JSONB[];
    lane_data RECORD;
    volume_trend RECORD;
    rate_trend RECORD;
BEGIN
    -- Get lane data
    SELECT * INTO lane_data
    FROM lanes
    WHERE id = lane_id;

    -- Get volume trends
    WITH volume_data AS (
        SELECT 
            COUNT(*) as current_volume,
            LAG(COUNT(*)) OVER (ORDER BY date_trunc('month', created_at)) as prev_volume
        FROM postings
        WHERE 
            lane_id = lane_id
            AND created_at >= NOW() - INTERVAL '3 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at) DESC
        LIMIT 1
    )
    SELECT 
        CASE 
            WHEN current_volume > prev_volume THEN 'up'
            ELSE 'down'
        END as direction,
        ROUND(
            ((current_volume::FLOAT - prev_volume::FLOAT) / prev_volume::FLOAT) * 100
        ) as percentage
    INTO volume_trend
    FROM volume_data;

    -- Get rate trends
    WITH rate_data AS (
        SELECT 
            AVG(rate) as current_rate,
            LAG(AVG(rate)) OVER (ORDER BY date_trunc('month', created_at)) as prev_rate
        FROM postings
        WHERE 
            lane_id = lane_id
            AND created_at >= NOW() - INTERVAL '3 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at) DESC
        LIMIT 1
    )
    SELECT 
        CASE 
            WHEN current_rate > prev_rate THEN 'up'
            ELSE 'down'
        END as direction,
        ROUND(
            ((current_rate::FLOAT - prev_rate::FLOAT) / prev_rate::FLOAT) * 100
        ) as percentage
    INTO rate_trend
    FROM rate_data;

    -- Build insights array
    insights = ARRAY[
        jsonb_build_object(
            'type', 'volume',
            'message', CASE 
                WHEN volume_trend.direction = 'up' 
                THEN 'Volume is increasing in this lane'
                ELSE 'Volume is decreasing in this lane'
            END,
            'data', jsonb_build_object(
                'direction', volume_trend.direction,
                'percentage', volume_trend.percentage
            )
        ),
        jsonb_build_object(
            'type', 'rates',
            'message', CASE 
                WHEN rate_trend.direction = 'up' 
                THEN 'Rates are trending upward'
                ELSE 'Rates are trending downward'
            END,
            'data', jsonb_build_object(
                'direction', rate_trend.direction,
                'percentage', rate_trend.percentage
            )
        )
    ];

    RETURN insights;
END;
$$ LANGUAGE plpgsql;
