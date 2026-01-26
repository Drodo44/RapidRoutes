-- =============================================================================
-- RR NUMBER FORMAT - Random 5-Digit Numbers (No Leading Zeros)
-- =============================================================================
-- Generates: RR12341, RR98234, RR45672, etc.
-- Range: 10000-99999 (always 5 digits, randomized to avoid patterns)
-- =============================================================================

-- Drop and recreate function with random number generation
CREATE OR REPLACE FUNCTION get_next_rr_number()
RETURNS TEXT AS $$
DECLARE
  random_num INT;
  new_rr TEXT;
  exists_check INT;
BEGIN
  -- Loop until we find a unique random number
  LOOP
    -- Generate random 5-digit number (10000 to 99999)
    random_num := floor(random() * 90000 + 10000)::INT;
    new_rr := 'RR' || random_num::TEXT;
    
    -- Check if this RR number already exists
    SELECT COUNT(*) INTO exists_check
    FROM lane_city_choices
    WHERE rr_number = new_rr;
    
    -- If unique, return it
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN new_rr;
END;
$$ LANGUAGE plpgsql;

-- Test the function (should return something like RR47283)
SELECT get_next_rr_number();

-- =============================================================================
-- Expected Output Examples:
-- RR12341, RR98234, RR45672, RR76543, RR23891
-- Always 5 digits, no leading zeros, randomized order
-- =============================================================================
