
-- First, clean up existing functions if they exist
DROP FUNCTION IF EXISTS public.find_cities_within_radius(double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.find_cities_within_radius(double precision, double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.find_cities_within_radius(text, text, double precision);
DROP FUNCTION IF EXISTS public.find_cities_within_radius(text, text);

-- Create the coordinate-based function
CREATE OR REPLACE FUNCTION public.find_cities_within_radius(
  lat_param double precision, 
  lng_param double precision,
  radius_miles double precision DEFAULT 75
)
RETURNS TABLE (
  city text,
  state_or_province text,
  zip_code text,
  kma_code text,
  kma_name text,
  latitude double precision,
  longitude double precision,
  distance_miles double precision
) AS $$
SELECT 
  c.city,
  c.state_or_province,
  c.zip as zip_code,
  c.kma_code,
  c.kma_name,
  c.latitude,
  c.longitude,
  (point(c.longitude, c.latitude) <@> point(lng_param, lat_param)) AS distance_miles
FROM 
  cities c
WHERE 
  (point(c.longitude, c.latitude) <@> point(lng_param, lat_param)) <= radius_miles
  AND c.latitude IS NOT NULL 
  AND c.longitude IS NOT NULL
ORDER BY 
  distance_miles ASC;
$$ LANGUAGE sql STABLE;

-- Create the city-based function
CREATE OR REPLACE FUNCTION public.find_cities_within_radius(
  p_city text,
  p_state text,
  p_radius_miles double precision DEFAULT 75
)
RETURNS TABLE (
  city text,
  state_or_province text,
  zip_code text,
  kma_code text,
  kma_name text,
  latitude double precision,
  longitude double precision,
  distance_miles double precision
) AS $$
DECLARE
  origin_lat double precision;
  origin_lng double precision;
BEGIN
  -- First find the coordinates of the reference city
  SELECT latitude, longitude INTO origin_lat, origin_lng
  FROM cities
  WHERE LOWER(city) = LOWER(p_city) AND LOWER(state_or_province) = LOWER(p_state)
  LIMIT 1;
  
  -- If city not found, return empty result
  IF origin_lat IS NULL OR origin_lng IS NULL THEN
    RETURN;
  END IF;

  -- Now find cities within the radius
  RETURN QUERY
  SELECT * FROM find_cities_within_radius(origin_lat, origin_lng, p_radius_miles);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(double precision, double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(double precision, double precision) TO anon;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(text, text, double precision) TO anon;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(text, text) TO anon;

-- Same grants for authenticated users
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(double precision, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(text, text, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_cities_within_radius(text, text) TO authenticated;
