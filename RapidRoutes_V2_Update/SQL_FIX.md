# SQL Fix for Missing RPC Function

This document contains the SQL fix that was applied to restore the missing `find_cities_within_radius` PostGIS function in the Supabase database.

## Fix Applied

```sql
-- Create the missing geospatial function to find cities within a radius
CREATE OR REPLACE FUNCTION public.find_cities_within_radius(
  origin_lat double precision,
  origin_lng double precision,
  radius_miles integer
)
RETURNS TABLE (
  id integer,
  city text,
  state_or_province text,
  zip text,
  latitude double precision,
  longitude double precision,
  kma_code text,
  kma_name text,
  distance_miles double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.city,
    c.state_or_province,
    c.zip,
    c.latitude,
    c.longitude,
    c.kma_code,
    c.kma_name,
    -- Calculate distance in miles using the haversine formula
    (
      3959 * acos(
        cos(radians(origin_lat)) * cos(radians(c.latitude)) * cos(radians(c.longitude) - radians(origin_lng)) +
        sin(radians(origin_lat)) * sin(radians(c.latitude))
      )
    )::double precision AS distance_miles
  FROM
    cities c
  WHERE
    -- Filter by radius using the haversine formula
    (
      3959 * acos(
        cos(radians(origin_lat)) * cos(radians(c.latitude)) * cos(radians(c.longitude) - radians(origin_lng)) +
        sin(radians(origin_lat)) * sin(radians(c.latitude))
      )
    ) <= radius_miles
  ORDER BY
    distance_miles ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions to use the function
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius TO service_role;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius TO anon;
```

## Verification

The function was successfully tested with a sample query:

```sql
SELECT * FROM find_cities_within_radius(39.7392, -104.9903, 50);
```

This query returns cities within a 50-mile radius of Denver, CO.

## Impact

This fix resolves the API errors when crawling for nearby cities during the lane generation process. The function is critical for the intelligence pairing API which requires geospatial queries to generate nearby city pairs.