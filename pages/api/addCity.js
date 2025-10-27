// pages/api/addCity.js
// API endpoint to add a new city to the database

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Lazy import admin client to avoid bundling in client
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
  } catch (e) {
    console.error('[addCity] Admin client import failed:', e?.message || e);
    return res.status(500).json({ error: 'Server configuration error: admin client unavailable' });
  }

  const { city, state, zip, kmaCode } = req.body;

  // Validate required fields
  if (!city || !state || !kmaCode) {
    return res.status(400).json({ 
      error: 'Missing required fields: city, state, and kmaCode are required' 
    });
  }

  try {
    // Get KMA name from existing cities
    const { data: kmaData, error: kmaError } = await supabaseAdmin
      .from('cities')
      .select('kma_name')
      .eq('kma_code', kmaCode)
      .limit(1)
      .single();

    if (kmaError && kmaError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('KMA lookup error:', kmaError);
      return res.status(500).json({ error: 'Failed to lookup KMA information' });
    }

    const kmaName = kmaData?.kma_name || 'Unknown';

    // Check if city already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('cities')
      .select('id')
      .eq('city', city.trim())
      .eq('state_or_province', state.toUpperCase())
      .limit(1);

    if (checkError) {
      console.error('Duplicate check error:', checkError);
      return res.status(500).json({ error: 'Failed to check for duplicate city' });
    }

    if (existing && existing.length > 0) {
      return res.status(409).json({ 
        error: `City ${city}, ${state} already exists in the database` 
      });
    }

    // Add the new city
    const { data: newCity, error: insertError } = await supabaseAdmin
      .from('cities')
      .insert([
        {
          city: city.trim(),
          state_or_province: state.toUpperCase(),
          zip: zip ? zip.trim() : null,
          kma_code: kmaCode,
          kma_name: kmaName,
          latitude: null, // Will be populated later if needed
          longitude: null // Will be populated later if needed
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return res.status(500).json({ error: 'Failed to add city to database' });
    }

    console.log(`✅ Successfully added city: ${city}, ${state} (${kmaCode})`);

    res.status(201).json({
      message: 'City added successfully',
      city: newCity
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
