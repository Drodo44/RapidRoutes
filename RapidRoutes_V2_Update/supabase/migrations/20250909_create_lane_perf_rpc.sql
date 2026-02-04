-- Create a transactional RPC to insert lane_performance and related crawl records atomically
-- This avoids partial writes and makes the server-side handler simple and robust.

CREATE OR REPLACE FUNCTION public.create_lane_performance_with_crawls(p_lane jsonb)
RETURNS TABLE (performance_id uuid) LANGUAGE plpgsql
AS $$
DECLARE
  lp_id UUID;
  elem jsonb;
  pickup jsonb;
  delivery jsonb;
BEGIN
  -- Insert master record
  INSERT INTO lane_performance (
    lane_id, equipment_code, origin_city, origin_state, dest_city, dest_state, crawl_cities, success_metrics
  ) VALUES (
    (p_lane->>'lane_id')::uuid,
    upper(p_lane->>'equipment_code'),
    p_lane->>'origin_city',
    upper(p_lane->>'origin_state'),
    p_lane->>'dest_city',
    upper(p_lane->>'dest_state'),
    COALESCE(p_lane->'crawl_cities', '[]'::jsonb),
    COALESCE(p_lane->'intelligence_metadata', '{}'::jsonb)
  ) RETURNING id INTO lp_id;

  -- Insert crawl rows if present
  IF p_lane ? 'crawl_cities' AND jsonb_array_length(p_lane->'crawl_cities') > 0 THEN
    FOR elem IN SELECT * FROM jsonb_array_elements(p_lane->'crawl_cities') LOOP
      pickup := elem->'pickup';
      delivery := elem->'delivery';

      IF pickup IS NOT NULL THEN
        INSERT INTO crawl_city_performance (lane_performance_id, city, state, kma_code, position_type, intelligence_score)
        VALUES (
          lp_id,
          pickup->>'city',
          pickup->>'state',
          pickup->>'kma_code',
          'pickup',
          COALESCE((elem->>'score')::numeric, 0.5)
        );
      END IF;

      IF delivery IS NOT NULL THEN
        INSERT INTO crawl_city_performance (lane_performance_id, city, state, kma_code, position_type, intelligence_score)
        VALUES (
          lp_id,
          delivery->>'city',
          delivery->>'state',
          delivery->>'kma_code',
          'delivery',
          COALESCE((elem->>'score')::numeric, 0.5)
        );
      END IF;
    END LOOP;
  END IF;

  RETURN QUERY SELECT lp_id;
END;
$$;
