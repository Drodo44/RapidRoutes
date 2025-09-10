-- Create posted_pairs table to track generated RR numbers for search functionality
CREATE TABLE IF NOT EXISTS posted_pairs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lane_id UUID REFERENCES lanes(id) ON DELETE CASCADE,
    reference_id VARCHAR(10) NOT NULL,
    origin_city VARCHAR(100) NOT NULL,
    origin_state VARCHAR(10) NOT NULL,
    dest_city VARCHAR(100) NOT NULL,
    dest_state VARCHAR(10) NOT NULL,
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    INDEX (reference_id),
    INDEX (lane_id),
    INDEX (posted_at)
);

-- Enable RLS
ALTER TABLE posted_pairs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own posted pairs
CREATE POLICY "Users can access their own posted pairs" ON posted_pairs
    FOR ALL USING (created_by = auth.uid());

-- Update lanes table to support new status workflow
-- Add covered status option alongside pending, posted
-- Note: We'll handle this in the application logic since the existing statuses work
