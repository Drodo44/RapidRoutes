-- Add columns for storing user-selected city pairs
-- These store the arrays of cities the user checks in the "Post Options" page

ALTER TABLE lanes 
ADD COLUMN IF NOT EXISTS saved_origin_cities JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS saved_dest_cities JSONB DEFAULT '[]';

-- Add helpful comment
COMMENT ON COLUMN lanes.saved_origin_cities IS 'Array of origin cities user selected for posting';
COMMENT ON COLUMN lanes.saved_dest_cities IS 'Array of destination cities user selected for posting';
