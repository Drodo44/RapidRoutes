-- migrations/010_add_radius_miles_function.sql
-- Adds miles-based wrapper for city radius lookup (100-mile hard cap enforced in application layer)
CREATE OR REPLACE FUNCTION find_cities_within_radius_miles(
  lat_param double precision,
  lng_param double precision,
  radius_miles double precision
)
RETURNS SETOF cities AS $$
  SELECT * FROM cities
  WHERE ST_DWithin(
    ST_MakePoint(longitude, latitude)::geography,
    ST_MakePoint(lng_param, lat_param)::geography,
    GREATEST(LEAST(radius_miles, 100), 0) * 1609.34 -- clamp 0..100 then convert miles->meters
  )
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION find_cities_within_radius_miles(double precision,double precision,double precision) TO anon;
GRANT EXECUTE ON FUNCTION find_cities_within_radius_miles(double precision,double precision,double precision) TO authenticated;
