-- Add indexes to cities table for geographic search performance
-- This fixes the timeout issue when searching for cities near a location

-- Index for latitude/longitude range queries (used in geographic crawl)
CREATE INDEX IF NOT EXISTS idx_cities_lat_lon ON cities (latitude, longitude);

-- Index for state+lat/lon queries (common filter pattern)
CREATE INDEX IF NOT EXISTS idx_cities_state_lat_lon ON cities (state_or_province, latitude, longitude);

-- Index for KMA code lookups
CREATE INDEX IF NOT EXISTS idx_cities_kma_code ON cities (kma_code) WHERE kma_code IS NOT NULL;

-- Analyze the table to update statistics
ANALYZE cities;
