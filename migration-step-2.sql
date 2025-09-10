-- Step 2: Create indexes
CREATE INDEX IF NOT EXISTS idx_posted_pairs_reference_id ON posted_pairs(reference_id);
CREATE INDEX IF NOT EXISTS idx_posted_pairs_lane_id ON posted_pairs(lane_id);
CREATE INDEX IF NOT EXISTS idx_posted_pairs_posted_at ON posted_pairs(posted_at);
