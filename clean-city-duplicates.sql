-- Clean up city duplicates - keep only one entry per city/state combination
-- This will eliminate the root cause of duplicate city issues in geographic crawl

-- First, let's see what we're working with
SELECT 
    city, 
    state_or_province,
    COUNT(*) as duplicate_count,
    MIN(zip) as first_zip,
    MAX(zip) as last_zip,
    MAX(kma_code) as kma_code -- Should be the same for all duplicates
FROM cities 
GROUP BY city, state_or_province 
HAVING COUNT(*) > 1 
ORDER BY duplicate_count DESC 
LIMIT 20;

-- Create a new clean cities table
CREATE TABLE cities_clean AS
SELECT DISTINCT ON (city, state_or_province)
    city,
    state_or_province,
    zip,
    latitude,
    longitude,
    kma_code,
    kma_name
FROM cities
WHERE latitude IS NOT NULL 
    AND longitude IS NOT NULL 
    AND kma_code IS NOT NULL
ORDER BY city, state_or_province, zip;

-- Check the results
SELECT COUNT(*) as original_count FROM cities;
SELECT COUNT(*) as clean_count FROM cities_clean;

-- Verify no duplicates remain
SELECT 
    city, 
    state_or_province,
    COUNT(*) as count
FROM cities_clean 
GROUP BY city, state_or_province 
HAVING COUNT(*) > 1;

-- If everything looks good, we can replace the original table
-- (This would be done in a separate migration after testing)
-- DROP TABLE cities;
-- ALTER TABLE cities_clean RENAME TO cities;
