-- Add reference_id field to lanes table for CSV tracking
-- This will generate unique 5-digit reference IDs for lane tracking

-- Add the reference_id column
ALTER TABLE lanes ADD COLUMN reference_id VARCHAR(8);

-- Create a function to generate unique reference IDs
CREATE OR REPLACE FUNCTION generate_lane_reference_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate a 5-digit reference ID - PURE NUMERIC ONLY
    -- Format: RR + 5 digits (e.g., RR12345, RR00001, RR99999)
    NEW.reference_id = 'RR' || LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 100000)::TEXT, 5, '0');
    
    -- Ensure uniqueness by checking for conflicts
    WHILE EXISTS (SELECT 1 FROM lanes WHERE reference_id = NEW.reference_id) LOOP
        -- Use pure random numeric approach for conflicts
        NEW.reference_id = 'RR' || LPAD((RANDOM() * 99999 + 1)::INT::TEXT, 5, '0');
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate reference_id for new lanes
CREATE TRIGGER trigger_generate_lane_reference_id
    BEFORE INSERT ON lanes
    FOR EACH ROW
    WHEN (NEW.reference_id IS NULL)
    EXECUTE FUNCTION generate_lane_reference_id();

-- Update existing lanes to have reference IDs
-- Fix any broken reference IDs (RR00NaN, etc.)
UPDATE lanes 
SET reference_id = 'RR' || LPAD((EXTRACT(EPOCH FROM created_at)::BIGINT % 100000)::TEXT, 5, '0')
WHERE reference_id IS NULL 
   OR reference_id = '' 
   OR reference_id LIKE '%NaN%'
   OR reference_id NOT SIMILAR TO 'RR[0-9]{5}';

-- For any remaining conflicts, add uniqueness
UPDATE lanes 
SET reference_id = 'RR' || LPAD((id % 100000)::TEXT, 5, '0')
WHERE reference_id IS NULL 
   OR reference_id = '';

-- Create index for fast reference ID lookups
CREATE INDEX idx_lanes_reference_id ON lanes(reference_id);

-- Add unique constraint
ALTER TABLE lanes ADD CONSTRAINT unique_lane_reference_id UNIQUE (reference_id);
