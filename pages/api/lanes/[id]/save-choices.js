// ============================================================================
// API: Save broker's city choices and generate RR number
// ============================================================================
// Purpose: Store selected cities in lane_city_choices table
// Auto-generates: RR number (e.g., RR00012)
// ============================================================================

const IS_DEV = process.env.NODE_ENV !== 'production';

function isMissingColumnError(error) {
  const message = String(error?.message || '');
  return /column .* does not exist/i.test(message);
}

async function persistLaneSavedCities({ supabase, laneId, originCities, destCities }) {
  const payloadVariants = [
    { saved_origin_cities: originCities, saved_dest_cities: destCities },
    { saved_origins: originCities, saved_dests: destCities },
    { origin_cities: originCities, dest_cities: destCities }
  ];

  let lastError = null;
  for (const payload of payloadVariants) {
    const { error } = await supabase
      .from('lanes')
      .update(payload)
      .eq('id', laneId);

    if (!error) {
      return { ok: true, payload };
    }

    lastError = error;
    if (!isMissingColumnError(error)) {
      break;
    }
  }

  return { ok: false, error: lastError };
}

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (importErr) {
    return res.status(500).json({ error: 'Admin client initialization failed' });
  }

  const { id } = req.query;
  const supabase = supabaseAdmin;

  // Prevent caching of GET results
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'GET') {
    const { data } = await supabaseAdmin
      .from('lane_city_choices')
      .select('origin_cities, dest_cities')
      .eq('lane_id', id)
      .maybeSingle();

    return res.status(200).json(data || {});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { origin_cities, dest_cities } = req.body;

  // Validate input
  if (!origin_cities || !Array.isArray(origin_cities) || origin_cities.length === 0) {
    return res.status(400).json({ error: 'origin_cities must be a non-empty array' });
  }

  if (!dest_cities || !Array.isArray(dest_cities) || dest_cities.length === 0) {
    return res.status(400).json({ error: 'dest_cities must be a non-empty array' });
  }

  try {
    // Check if lane exists
    const { data: lane, error: laneError } = await supabase
      .from('lanes')
      .select('id, origin_city, origin_state, dest_city, dest_state, destination_city, destination_state')
      .eq('id', id)
      .single();

    if (laneError) throw laneError;
    if (!lane) {
      return res.status(404).json({ error: 'Lane not found' });
    }

    const laneDestCity = lane.dest_city || lane.destination_city || null;
    const laneDestState = lane.dest_state || lane.destination_state || null;

    // Check if choices already exist for this lane
    const { data: existing, error: existingError } = await supabase
      .from('lane_city_choices')
      .select('id, rr_number')
      .eq('lane_id', id)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    let result;

    if (existing) {
      // Update existing choices
      const { data, error } = await supabase
        .from('lane_city_choices')
        .update({
          origin_cities: origin_cities,
          dest_cities: dest_cities,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Generate new RR number and insert
      const { data: rrData, error: rrError } = await supabase
        .rpc('get_next_rr_number');

      if (rrError) throw rrError;

      const rr_number = rrData;

      const { data, error } = await supabase
        .from('lane_city_choices')
        .insert({
          lane_id: id,
          origin_city: lane.origin_city,
          origin_state: lane.origin_state,
          dest_city: laneDestCity,
          dest_state: laneDestState,
          origin_cities: origin_cities,
          dest_cities: dest_cities,
          rr_number: rr_number
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    const laneSaveResult = await persistLaneSavedCities({
      supabase,
      laneId: id,
      originCities: origin_cities,
      destCities: dest_cities
    });

    if (!laneSaveResult.ok) {
      throw laneSaveResult.error || new Error('Failed to persist lane saved city selections');
    }

    if (IS_DEV) {
      console.log('[save-choices] saved lane city selections', {
        lane_id: id,
        rr_number: result.rr_number,
        origin_count: origin_cities.length,
        dest_count: dest_cities.length,
        lane_payload: laneSaveResult.payload
      });
    }

    res.status(200).json({
      success: true,
      rr_number: result.rr_number,
      lane_id: id,
      origin_count: origin_cities.length,
      dest_count: dest_cities.length,
      total_pairs: origin_cities.length * dest_cities.length
    });

  } catch (error) {
    console.error('Error saving city choices:', error);
    res.status(500).json({ error: error.message });
  }
}
