-- Add reference_id column to lanes table
-- This will store a unique 5-digit reference ID for each lane

ALTER TABLE lanes ADD COLUMN IF NOT EXISTS reference_id VARCHAR(8) UNIQUE;

-- Create index for fast reference ID lookups
CREATE INDEX IF NOT EXISTS idx_lanes_reference_id ON lanes(reference_id);

-- Function to generate a unique 5-digit reference ID
CREATE OR REPLACE FUNCTION generate_reference_id() RETURNS VARCHAR(8) AS $$
DECLARE
    new_id VARCHAR(8);
    counter INTEGER := 0;
BEGIN
    LOOP
        -- Generate a 5-digit number (10000 to 99999)
        new_id := LPAD((FLOOR(RANDOM() * 90000) + 10000)::TEXT, 5, '0');
        
        -- Check if this ID already exists
        IF NOT EXISTS (SELECT 1 FROM lanes WHERE reference_id = new_id) THEN
            RETURN new_id;
        END IF;
        
        -- Safety counter to prevent infinite loop
        counter := counter + 1;
        IF counter > 1000 THEN
            RAISE EXCEPTION 'Unable to generate unique reference ID after 1000 attempts';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update existing lanes without reference IDs
UPDATE lanes 
SET reference_id = generate_reference_id() 
WHERE reference_id IS NULL;

-- Create trigger to auto-generate reference ID for new lanes
CREATE OR REPLACE FUNCTION assign_reference_id() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reference_id IS NULL THEN
        NEW.reference_id := generate_reference_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_reference_id ON lanes;
CREATE TRIGGER trigger_assign_reference_id
    BEFORE INSERT ON lanes
    FOR EACH ROW
    EXECUTE FUNCTION assign_reference_id();
