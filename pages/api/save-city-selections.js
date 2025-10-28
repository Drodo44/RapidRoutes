// pages/api/save-city-selections.js
// API endpoint to save user-selected city pairs for a lane

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
    // Update the lane with saved city selections
    const { data, error } = await supabaseAdmin
      .from('lanes')
      .update({
        saved_origin_cities: originCities,
        saved_dest_cities: destCities
      })
      .eq('id', laneId)
      .select()
      .single();

    if (error) {
      console.error('[save-city-selections] Update failed:', error);
      return res.status(500).json({ 
        error: 'Failed to save selections',
        details: error.message 
      });
    }

    // Calculate total postings: original lane + alternative pairs, × 2 contact methods (email + phone)
    const numAlternativePairs = Math.min(originCities.length, destCities.length);
    const totalPairs = 1 + numAlternativePairs; // 1 original lane + alternatives
    const totalPostings = totalPairs * 2;

    console.log(`✅ Saved city selections for lane ${laneId}: ${totalPairs} pairs (1 original + ${numAlternativePairs} alternatives) × 2 contact methods = ${totalPostings} postings`);

    return res.status(200).json({ 
      success: true,
      message: 'City selections saved successfully',
      totalCombinations: totalPostings,
      lane: data
    });
  } catch (error) {
    console.error('[save-city-selections] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
