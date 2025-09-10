-- Step 1: Create the posted_pairs table
CREATE TABLE IF NOT EXISTS posted_pairs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lane_id UUID REFERENCES lanes(id) ON DELETE CASCADE,
    reference_id VARCHAR(10) NOT NULL,
    origin_city VARCHAR(100) NOT NULL,
    origin_state VARCHAR(10) NOT NULL,
    dest_city VARCHAR(100) NOT NULL,
    dest_state VARCHAR(10) NOT NULL,
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);
