// Check lanes in database

export default async function handler(req, res) {
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;

    const { data: lanes, error } = await supabaseAdmin
      .from('lanes')
      .select('*')
      .eq('lane_status', 'current')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Failed to fetch lanes', error);
      return res.status(500).json({ error: 'Failed to fetch lanes', details: error.message });
    }
    
    console.log(`Found ${lanes?.length || 0} pending lanes`);
    
    return res.status(200).json({
      count: lanes?.length || 0,
      lanes: lanes?.map(lane => ({
        id: lane.id,
        origin: `${lane.origin_city}, ${lane.origin_state}`,
        dest: `${lane.dest_city}, ${lane.dest_state}`,
        equipment: lane.equipment_code,
        weight: lane.weight_lbs,
        created: lane.created_at
      })) || []
    });
  } catch (error) {
    console.error('Lane check error:', error);
    return res.status(500).json({ error: 'Unexpected failure', details: error.message });
  }
}
