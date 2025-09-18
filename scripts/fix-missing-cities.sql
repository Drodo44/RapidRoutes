-- Fix missing cities with coordinates and KMA codes
-- Run this on Supabase SQL editor to repair the cities table

-- First, ensure cities table exists with correct structure
CREATE TABLE IF NOT EXISTS public.cities (
    id SERIAL PRIMARY KEY,
    city TEXT NOT NULL,
    state_or_province TEXT NOT NULL,
    zip TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    kma_code TEXT,
    UNIQUE(city, state_or_province)
);

-- Create missing cities with coordinates
INSERT INTO public.cities (city, state_or_province, latitude, longitude, kma_code)
VALUES 
    ('Riegelwood', 'NC', 34.3321, -78.2114, 'ILM'),  -- Wilmington KMA
    ('Russellville', 'AR', 35.2784, -93.1337, 'LIT'), -- Little Rock KMA
    ('Massillon', 'OH', 40.7967, -81.5215, 'CAK'),    -- Canton KMA
    ('Frisco', 'TX', 33.1507, -96.8236, 'DAL'),       -- Dallas KMA
    ('Warren', 'AR', 33.6126, -92.0644, 'LIT')        -- Little Rock KMA
ON CONFLICT (city, state_or_province) 
DO UPDATE SET 
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    kma_code = EXCLUDED.kma_code;

-- Create the radius search function if it doesn't exist
CREATE OR REPLACE FUNCTION find_cities_within_radius(
    lat_param double precision,
    lng_param double precision,
    radius_meters double precision
) RETURNS TABLE (
    city text,
    state_or_province text,
    zip text,
    latitude double precision,
    longitude double precision,
    kma_code text,
    distance_meters double precision
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.city,
        c.state_or_province,
        c.zip,
        c.latitude,
        c.longitude,
        c.kma_code,
        (point(c.latitude, c.longitude) <@> point(lat_param, lng_param)) * 1609.34 as distance_meters
    FROM cities c
    WHERE c.latitude IS NOT NULL 
      AND c.longitude IS NOT NULL
      AND c.kma_code IS NOT NULL
      AND (point(c.latitude, c.longitude) <@> point(lat_param, lng_param)) * 1609.34 <= radius_meters
    ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql;