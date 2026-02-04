-- Test query to manually recompute Fitzgerald nearby cities
-- This will show us exactly what the SQL should find

WITH fitzgerald AS (
  SELECT id, city, state_or_province, latitude, longitude
  FROM cities
  WHERE city = 'Fitzgerald' AND state_or_province = 'GA'
  LIMIT 1
)
SELECT 
  c.city,
  c.state_or_province,
  c.kma_code,
  c.kma_name,
  ROUND(CAST(
    ST_Distance(
      ST_MakePoint(f.longitude, f.latitude)::geography,
      ST_MakePoint(c.longitude, c.latitude)::geography
    ) / 1609.34 AS numeric), 1) as miles
FROM cities c, fitzgerald f
WHERE c.latitude IS NOT NULL
  AND c.longitude IS NOT NULL
  AND (c.city != f.city OR c.state_or_province != f.state_or_province)
  AND ST_DWithin(
    ST_MakePoint(f.longitude, f.latitude)::geography,
    ST_MakePoint(c.longitude, c.latitude)::geography,
    160934  -- 100 miles in meters
  )
ORDER BY miles
LIMIT 50;
