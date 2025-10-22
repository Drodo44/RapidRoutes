// ============================================================================
// API: Save broker's city choices and generate RR number
// ============================================================================
// Purpose: Store selected cities in lane_city_choices table
// Auto-generates: RR number (e.g., RR00012)
// ============================================================================

import supabaseAdmin from '@/lib/supabaseAdmin';
const supabase = supabaseAdmin;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
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
      .select('id, origin_city, origin_state, dest_city, dest_state')
      .eq('id', id)
      .single();

    if (laneError) throw laneError;
    if (!lane) {
      return res.status(404).json({ error: 'Lane not found' });
    }

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
          dest_city: lane.dest_city,
          dest_state: lane.dest_state,
          origin_cities: origin_cities,
          dest_cities: dest_cities,
          rr_number: rr_number
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
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
