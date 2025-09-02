-- Add reference_id column to lanes table
-- This will store a unique RR+5digit reference ID for each lane (matching CSV export format)

ALTER TABLE lanes ADD COLUMN IF NOT EXISTS reference_id VARCHAR(8) UNIQUE;

-- Create index for fast reference ID lookups
CREATE INDEX IF NOT EXISTS idx_lanes_reference_id ON lanes(reference_id);

-- Function to generate a unique RR+5digit reference ID (same format as CSV export)
CREATE OR REPLACE FUNCTION generate_reference_id() RETURNS VARCHAR(8) AS $$
DECLARE
    new_id VARCHAR(8);
    counter INTEGER := 0;
    next_num INTEGER;
BEGIN
    LOOP
        -- Get next sequential number based on existing reference IDs
        SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 3) AS INTEGER)), 9999) + 1
        INTO next_num
        FROM lanes 
        WHERE reference_id ~ '^RR[0-9]{5}$';
        
        -- Ensure we stay within 5 digits (10000-99999)
        IF next_num > 99999 THEN
            next_num := 10000;
        END IF;
        
        new_id := 'RR' || LPAD(next_num::TEXT, 5, '0');
        
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
