-- migrations/fix-destination-fields-mapping.sql
-- Migration to fix destination field mapping in lanes table

-- Update lanes where destination_city is NULL but dest_city exists
UPDATE lanes 
SET destination_city = dest_city 
WHERE destination_city IS NULL AND dest_city IS NOT NULL;

-- Update lanes where destination_state is NULL but dest_state exists
UPDATE lanes 
SET destination_state = dest_state 
WHERE destination_state IS NULL AND dest_state IS NOT NULL;

-- Log the operation
INSERT INTO operation_logs (
  operation_type, 
  description, 
  record_count, 
  success
)
VALUES (
  'migration', 
  'Fix destination field mapping in lanes table', 
  (SELECT COUNT(*) FROM lanes WHERE 
    (destination_city IS NULL AND dest_city IS NOT NULL) OR
    (destination_state IS NULL AND dest_state IS NOT NULL)
  ),
  TRUE
);