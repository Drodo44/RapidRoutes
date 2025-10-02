// pages/api/save-city-choices.js
// Save broker's city selections to database

import { adminSupabase as supabase } from '../../utils/supabaseClient.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
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
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!origin_chosen_cities?.length && !dest_chosen_cities?.length) {
      return res.status(400).json({ error: 'Must select at least one city' });
    }

    // Get next RR number
    const { data: rrData, error: rrError } = await supabase
      .rpc('get_next_rr_number');

    if (rrError) {
      console.error('[Save City Choices] Error getting RR number:', rrError);
      return res.status(500).json({ error: 'Failed to generate RR number' });
    }

    const rr_number = rrData || 'RR00001';

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

    console.log('[Save City Choices] Success:', {
      lane_id,
      rr_number,
      origin_count: origin_chosen_cities?.length || 0,
      dest_count: dest_chosen_cities?.length || 0
    });

    return res.status(200).json({
      ok: true,
      rr_number,
      data
    });

  } catch (error) {
    console.error('[Save City Choices] Unexpected error:', error);
    return res.status(500).json({ error: error.message });
  }
}
