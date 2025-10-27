// ============================================================================
// API: Get nearby cities for a lane (instant lookup from pre-computed data)
// ============================================================================
// Purpose: Fetch pre-computed nearby cities from JSONB column
// Performance: ~50ms (vs 30s with real-time ST_Distance calculations)
// ============================================================================

const supabase = supabaseAdmin;

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import(\'@/lib/supabaseAdmin\')).default;
  } catch (importErr) {
    return res.status(500).json({ error: \'Admin client initialization failed\' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    // Fetch the lane to get origin and destination
    const { data: lane, error: laneError } = await supabase
      .from('lanes')
      .select('origin_city, origin_state, dest_city, dest_state')
      .eq('id', id)
      .single();

    if (laneError) throw laneError;
    if (!lane) {
      return res.status(404).json({ error: 'Lane not found' });
    }

    // Fetch origin city
    const { data: originCity, error: originError } = await supabase
      .from('cities')
      .select('id, nearby_cities, city, state_or_province, latitude, longitude')
      .eq('city', lane.origin_city)
      .eq('state_or_province', lane.origin_state)
      .single();

    if (originError) throw originError;

    // If origin doesn't have nearby cities computed yet, compute them now
    if (!originCity.nearby_cities) {
      const { data: computed, error: computeError } = await supabase
        .rpc('compute_nearby_cities', { target_city_id: originCity.id });
      
      if (!computeError) {
        originCity.nearby_cities = computed;
      }
    }

    // Fetch destination city
    const { data: destCity, error: destError } = await supabase
      .from('cities')
      .select('id, nearby_cities, city, state_or_province, latitude, longitude')
      .eq('city', lane.dest_city)
      .eq('state_or_province', lane.dest_state)
      .single();

    if (destError) throw destError;

    // If destination doesn't have nearby cities computed yet, compute them now
    if (!destCity.nearby_cities) {
      const { data: computed, error: computeError } = await supabase
        .rpc('compute_nearby_cities', { target_city_id: destCity.id });
      
      if (!computeError) {
        destCity.nearby_cities = computed;
      }
    }

    // Return both origin and destination nearby cities
    res.status(200).json({
      origin: {
        city: originCity.city,
        state: originCity.state_or_province,
        latitude: originCity.latitude,
        longitude: originCity.longitude,
        nearby_cities: originCity.nearby_cities || { kmas: {} }
      },
      destination: {
        city: destCity.city,
        state: destCity.state_or_province,
        latitude: destCity.latitude,
        longitude: destCity.longitude,
        nearby_cities: destCity.nearby_cities || { kmas: {} }
      },
      lane_id: id
    });

  } catch (error) {
    console.error('Error fetching nearby cities:', error);
    res.status(500).json({ error: error.message });
  }
}
