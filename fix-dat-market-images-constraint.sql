-- Fix dat_market_images table - Add UNIQUE constraint for equipment_type
-- This is required for upsert operations with ON CONFLICT

-- First, check if table exists and what constraints it has
-- If the table already has data with duplicate equipment_type, this will fail
-- In that case, you need to delete duplicates first

-- Add UNIQUE constraint to equipment_type column
ALTER TABLE dat_market_images 
ADD CONSTRAINT dat_market_images_equipment_type_unique 
UNIQUE (equipment_type);

-- Verify the constraint was added
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'dat_market_images'::regclass;
