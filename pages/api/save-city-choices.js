// pages/api/save-city-choices.js
// Save broker's city selections to database

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    const {
      lane_id,
      origin_city,
      origin_state,
      dest_city,
      dest_state,
      origin_chosen_cities,
      dest_chosen_cities
    } = req.body;

    // Validate required fields
    if (!lane_id || !origin_city || !origin_state || !dest_city || !dest_state) {
      console.error('[Save City Choices] Missing required fields:', { lane_id, origin_city, origin_state, dest_city, dest_state });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!origin_chosen_cities?.length && !dest_chosen_cities?.length) {
      return res.status(400).json({ error: 'Must select at least one city' });
    }

    console.log('[Save City Choices] Received request:', {
      lane_id,
      origin_city,
      origin_state,
      dest_city,
      dest_state,
      origin_count: origin_chosen_cities?.length || 0,
      dest_count: dest_chosen_cities?.length || 0
    });

    // Get next RR number
    let rr_number = 'RR00001';
    try {
      const { data: rrData, error: rrError } = await supabase
        .rpc('get_next_rr_number');

      if (rrError) {
        console.error('[Save City Choices] Error getting RR number (will use default):', rrError);
      } else if (rrData) {
        rr_number = rrData;
      }
    } catch (rrErr) {
      console.error('[Save City Choices] RR number function not available:', rrErr.message);
    }

    // Upsert city choices (update if exists, insert if not)
    const { data, error } = await supabase
      .from('lane_city_choices')
      .upsert({
        lane_id,
        origin_city,
        origin_state,
        dest_city,
        dest_state,
        origin_chosen_cities: origin_chosen_cities || [],
        dest_chosen_cities: dest_chosen_cities || [],
        rr_number,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'lane_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[Save City Choices] Database error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Update lane status to 'current' so it shows up in the lanes list
    const { error: laneUpdateError } = await supabase
      .from('lanes')
      .update({ lane_status: 'current' })
      .eq('id', lane_id);

    if (laneUpdateError) {
      console.error('[Save City Choices] Warning: Could not update lane status:', laneUpdateError);
      // Don't fail the request, just log the warning
    }

    console.log('[Save City Choices] Success:', {
      lane_id,
      rr_number,
      origin_count: origin_chosen_cities?.length || 0,
      dest_count: dest_chosen_cities?.length || 0,
      lane_status_updated: !laneUpdateError
    });

    return res.status(200).json({
      ok: true,
      rr_number,
      data,
      lane_status: 'active'
    });

  } catch (error) {
    console.error('[Save City Choices] Unexpected error:', error);
    return res.status(500).json({ error: error.message });
  }
}
