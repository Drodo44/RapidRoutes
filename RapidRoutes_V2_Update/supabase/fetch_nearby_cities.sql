-- RPC function for fast nearby cities lookup
-- This function is used by the intelligent crawler for equipment-based city generation

CREATE OR REPLACE FUNCTION fetch_nearby_cities(
    i_lat DOUBLE PRECISION,
    i_lon DOUBLE PRECISION, 
    i_radius_miles DOUBLE PRECISION,
    i_equipment TEXT DEFAULT NULL,
    i_expand_if_needed BOOLEAN DEFAULT FALSE,
    i_max INTEGER DEFAULT 500
)
RETURNS TABLE (
    id UUID,
    city TEXT,
    state_or_province TEXT,
    postal_code TEXT,
    zip TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    kma TEXT,
    population INTEGER,
    equipment_bias TEXT[],
    is_hot BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    lat_delta DOUBLE PRECISION;
    lon_delta DOUBLE PRECISION;
    earth_radius_miles CONSTANT DOUBLE PRECISION := 3959.0;
BEGIN
    -- Calculate bounding box deltas (approximate)
    lat_delta := i_radius_miles / 69.0;
    lon_delta := i_radius_miles / (69.0 * cos(radians(i_lat)));
    
    -- Return cities within the radius using the haversine formula
    RETURN QUERY
    SELECT 
        c.id,
        c.city,
        c.state_or_province,
        c.postal_code,
        c.postal_code as zip, -- alias for compatibility
        c.latitude,
        c.longitude,
        c.latitude as lat, -- alias for compatibility
        c.longitude as lon, -- alias for compatibility
        c.kma,
        c.population,
        c.equipment_bias,
        c.is_hot
    FROM cities c
    WHERE 
        -- Bounding box filter for performance
        c.latitude BETWEEN (i_lat - lat_delta) AND (i_lat + lat_delta)
        AND c.longitude BETWEEN (i_lon - lon_delta) AND (i_lon + lon_delta)
        -- Precise distance calculation
        AND (
            earth_radius_miles * acos(
                cos(radians(i_lat)) * cos(radians(c.latitude)) * 
                cos(radians(c.longitude) - radians(i_lon)) + 
                sin(radians(i_lat)) * sin(radians(c.latitude))
            )
        ) <= i_radius_miles
        -- Equipment filter if specified
        AND (i_equipment IS NULL OR c.equipment_bias @> ARRAY[i_equipment])
    ORDER BY 
        -- Distance ascending
        (earth_radius_miles * acos(
            cos(radians(i_lat)) * cos(radians(c.latitude)) * 
            cos(radians(c.longitude) - radians(i_lon)) + 
            sin(radians(i_lat)) * sin(radians(c.latitude))
        ))
    LIMIT i_max;
END;
$$;

-- Create index for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_cities_location ON cities USING GIST (ll_to_earth(latitude, longitude));
CREATE INDEX IF NOT EXISTS idx_cities_equipment_bias ON cities USING GIN (equipment_bias);
CREATE INDEX IF NOT EXISTS idx_cities_lat_lon ON cities (latitude, longitude);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fetch_nearby_cities TO authenticated;
GRANT EXECUTE ON FUNCTION fetch_nearby_cities TO anon;
