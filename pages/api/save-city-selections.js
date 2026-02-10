// pages/api/save-city-selections.js
// API endpoint to save user-selected city pairs for a lane

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
    const { data, error } = await supabase
      .from('lanes')
      .update(payload)
      .eq('id', laneId)
      .select()
      .single();

    if (!error) {
      return { ok: true, data, payload };
    }

    lastError = error;
    if (!isMissingColumnError(error)) {
      break;
    }
  }

  return { ok: false, error: lastError };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (e) {
    console.error('[save-city-selections] Admin client init failed:', e?.message || e);
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const { laneId, originCities, destCities } = req.body;

  // Validate required fields
  if (!laneId || !originCities || !destCities) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      required: ['laneId', 'originCities', 'destCities']
    });
  }

  if (!Array.isArray(originCities) || !Array.isArray(destCities)) {
    return res.status(400).json({ 
      error: 'originCities and destCities must be arrays' 
    });
  }

  if (originCities.length === 0 || destCities.length === 0) {
    return res.status(400).json({ 
      error: 'At least one origin and one destination city must be selected' 
    });
  }

  try {
    const saveResult = await persistLaneSavedCities({
      supabase: supabaseAdmin,
      laneId,
      originCities,
      destCities,
    });

    if (!saveResult.ok) {
      console.error('[save-city-selections] Update failed:', saveResult.error);
      return res.status(500).json({ 
        error: 'Failed to save selections',
        details: saveResult.error?.message || 'Unknown error',
      });
    }

    // Calculate total postings: original lane + alternative pairs, × 2 contact methods (email + phone)
    const numAlternativePairs = Math.min(originCities.length, destCities.length);
    const totalPairs = 1 + numAlternativePairs; // 1 original lane + alternatives
    const totalPostings = totalPairs * 2;

    if (IS_DEV) {
      console.log('[save-city-selections] saved selections', {
        lane_id: laneId,
        origin_count: originCities.length,
        dest_count: destCities.length,
        payload: saveResult.payload,
        total_pairs: totalPairs,
        total_postings: totalPostings,
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'City selections saved successfully',
      totalCombinations: totalPostings,
      lane: saveResult.data,
    });
  } catch (error) {
    console.error('[save-city-selections] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
