// pages/api/admin/add-city.js
// API endpoint for admin city additions

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Lazy import admin client to avoid bundling in client
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (e) {
    console.error('[add-city] Admin client import failed:', e?.message || e);
    return res.status(500).json({ error: 'Server configuration error: admin client unavailable' });
  }

  try {
    const { city, state, zip, latitude, longitude, kmaCode, kmaName } = req.body;

    // Validate required fields
    if (!city || !state || !zip || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields: city, state, zip, latitude, longitude' });
    }

    // Insert city into database
    const { data, error } = await supabaseAdmin
      .from('cities')
      .insert({
        city: city.trim(),
        state_or_province: state.trim().toUpperCase(),
        zip: zip.trim(),
  latitude: Number.parseFloat(latitude),
  longitude: Number.parseFloat(longitude),
        kma_code: kmaCode?.trim() || 'UNK',
        kma_name: kmaName?.trim() || 'Unknown Market'
      })
      .select();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'City already exists in database' });
      }
      throw error;
    }

    // Log the addition for audit trail
    console.log(`🏛️ Admin added city: ${city}, ${state} ${zip} (${latitude}, ${longitude})`);

    res.status(201).json({ 
      message: `Successfully added ${city}, ${state}`,
      data: data[0]
    });

  } catch (error) {
    console.error('Add city error:', error);
    res.status(500).json({ error: error.message });
  }
}
