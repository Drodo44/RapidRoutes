// ============================================================================
// API: Delete saved city choices for a lane
// ============================================================================
import supabaseAdmin from '@/lib/supabaseAdmin';

function isMissingColumnError(error) {
  const message = String(error?.message || '');
  return /column .* does not exist/i.test(message);
}

async function clearLaneSavedCities({ laneId }) {
  const payloadVariants = [
    { saved_origin_cities: null, saved_dest_cities: null },
    { saved_origins: null, saved_dests: null },
    { origin_cities: null, dest_cities: null }
  ];

  let lastError = null;
  for (const payload of payloadVariants) {
    const { error } = await supabaseAdmin
      .from('lanes')
      .update(payload)
      .eq('id', laneId);

    if (!error) {
      return { ok: true };
    }

    lastError = error;
    if (!isMissingColumnError(error)) {
      break;
    }
  }

  return { ok: false, error: lastError };
}

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
    const clearResult = await clearLaneSavedCities({ laneId: id });
    if (!clearResult.ok) throw clearResult.error;

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Failed to delete choices:', err);
    res.status(500).json({ error: err.message });
  }
}
