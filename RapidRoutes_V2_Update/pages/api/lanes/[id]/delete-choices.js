// ============================================================================
// API: Delete saved city choices for a lane
// ============================================================================
import supabaseAdmin from '@/lib/supabaseAdmin';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    // 1. Delete from lane_city_choices table
    const { error: deleteError } = await supabaseAdmin
      .from('lane_city_choices')
      .delete()
      .eq('lane_id', id);

    if (deleteError) throw deleteError;

    // 2. Clear saved cities cache in main lanes table
    // This ensures the UI updates immediately as it reads from the lanes table
    const { error: updateError } = await supabaseAdmin
      .from('lanes')
      .update({
        saved_origin_cities: null,
        saved_dest_cities: null
      })
      .eq('id', id);
      
    if (updateError) throw updateError;

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Failed to delete choices:', err);
    res.status(500).json({ error: err.message });
  }
}
