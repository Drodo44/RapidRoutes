-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create geospatial function using standard PostGIS ST_ functions
CREATE OR REPLACE FUNCTION find_cities_within_radius(
  lat_param double precision, 
  lng_param double precision, 
  radius_meters double precision
)
RETURNS SETOF cities AS $$
  SELECT * FROM cities
  WHERE ST_DWithin(
    ST_MakePoint(longitude, latitude)::geography,
    ST_MakePoint(lng_param, lat_param)::geography,
    radius_meters
  )
  AND latitude IS NOT NULL 
  AND longitude IS NOT NULL;
$$ LANGUAGE sql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION find_cities_within_radius(double precision, double precision, double precision) TO authenticated;