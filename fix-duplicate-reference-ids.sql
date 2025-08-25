-- fix-duplicate-reference-ids.sql
-- Fix duplicate reference IDs that are showing in CSV exports

-- First, identify and fix any duplicate reference IDs
UPDATE lanes 
SET reference_id = 'RR' || LPAD((ROW_NUMBER() OVER (ORDER BY id))::TEXT, 5, '0')
WHERE id IN (
    SELECT id FROM (
        SELECT id, reference_id, 
               ROW_NUMBER() OVER (PARTITION BY reference_id ORDER BY id) as rn
        FROM lanes 
        WHERE reference_id IS NOT NULL
    ) t 
    WHERE rn > 1
);

-- Update any remaining invalid reference IDs
UPDATE lanes 
SET reference_id = 'RR' || LPAD((id % 100000)::TEXT, 5, '0')
WHERE reference_id IS NULL 
   OR reference_id = '' 
   OR reference_id LIKE '%NaN%'
   OR reference_id NOT SIMILAR TO 'RR[0-9]{5}'
   OR reference_id = 'RR00000';

-- Final pass: ensure all are unique by using a sequence approach
WITH numbered_lanes AS (
    SELECT id, 
           'RR' || LPAD((ROW_NUMBER() OVER (ORDER BY id))::TEXT, 5, '0') as new_ref_id
    FROM lanes
)
UPDATE lanes 
SET reference_id = numbered_lanes.new_ref_id
FROM numbered_lanes
WHERE lanes.id = numbered_lanes.id;
