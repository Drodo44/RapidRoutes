-- create-count-function.sql
CREATE OR REPLACE FUNCTION public.count_destination_stats()
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'has_city', COUNT(*) FILTER (WHERE destination_city IS NOT NULL),
    'has_state', COUNT(*) FILTER (WHERE destination_state IS NOT NULL),
    'total', COUNT(*)
  ) INTO result
  FROM lanes;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;