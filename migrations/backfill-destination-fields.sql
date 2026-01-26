-- /migrations/backfill-destination-fields.sql

-- Backfill destination_city from dest_city if both columns exist
-- This is safe to run multiple times (idempotent)
UPDATE lanes 
SET destination_city = COALESCE(destination_city, dest_city)
WHERE destination_city IS NULL AND dest_city IS NOT NULL;

-- Backfill destination_state from dest_state if both columns exist
-- This is safe to run multiple times (idempotent)
UPDATE lanes 
SET destination_state = COALESCE(destination_state, dest_state)
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
  'Backfill destination_city and destination_state from dest_city and dest_state', 
  (
    SELECT COUNT(*) FROM lanes 
    WHERE (destination_city IS NULL AND (
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lanes' AND column_name = 'dest_city'
        ) AND dest_city IS NOT NULL
      )) OR (destination_state IS NULL AND (
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'lanes' AND column_name = 'dest_state'
        ) AND dest_state IS NOT NULL
      ))
  ),
  TRUE
);