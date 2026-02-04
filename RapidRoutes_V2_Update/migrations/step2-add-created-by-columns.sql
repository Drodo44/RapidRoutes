-- STEP 2: Add created_by columns to tables that need it
-- SAFE: RLS is still disabled, this just adds columns and backfills data

-- Add created_by to blacklisted_cities
ALTER TABLE blacklisted_cities 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add created_by to city_corrections
ALTER TABLE city_corrections 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Add created_by to preferred_pickups
ALTER TABLE preferred_pickups 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Backfill all existing data with your user ID
-- This sets you as the owner of all existing data
UPDATE blacklisted_cities 
SET created_by = '389fa9a8-50e8-401f-a896-c9004ec99356' 
WHERE created_by IS NULL;

UPDATE city_corrections 
SET created_by = '389fa9a8-50e8-401f-a896-c9004ec99356' 
WHERE created_by IS NULL;

UPDATE preferred_pickups 
SET created_by = '389fa9a8-50e8-401f-a896-c9004ec99356' 
WHERE created_by IS NULL;

-- Verify the changes (returns counts)
SELECT 
  'blacklisted_cities' as table_name,
  COUNT(*) as total_rows,
  COUNT(created_by) as rows_with_created_by,
  COUNT(*) FILTER (WHERE created_by IS NULL) as rows_without_created_by
FROM blacklisted_cities
UNION ALL
SELECT 
  'city_corrections' as table_name,
  COUNT(*) as total_rows,
  COUNT(created_by) as rows_with_created_by,
  COUNT(*) FILTER (WHERE created_by IS NULL) as rows_without_created_by
FROM city_corrections
UNION ALL
SELECT 
  'preferred_pickups' as table_name,
  COUNT(*) as total_rows,
  COUNT(created_by) as rows_with_created_by,
  COUNT(*) FILTER (WHERE created_by IS NULL) as rows_without_created_by
FROM preferred_pickups;
