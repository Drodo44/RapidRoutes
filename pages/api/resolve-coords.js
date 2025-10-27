// pages/api/resolve-coords.js
// Resolve missing origin/destination coordinates by zip from zip3_kma_geo table.
// Dark-mode app: no UI here, just JSON.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let supabaseAdmin;
  try {
    supabaseAdmin = (await import('@/lib/supabaseAdmin')).default;
    const { origin_zip, dest_zip } = req.query;
    if (!origin_zip || !dest_zip) {
      return res.status(400).json({ error: 'Missing origin_zip or dest_zip' });
    }

    const { data: originRow, error: originError } = await adminSupabase
      .from('zip3_kma_geo')
      .select('latitude, longitude')
      .eq('zip', origin_zip)
      .single();

    const { data: destRow, error: destError } = await adminSupabase
      .from('zip3_kma_geo')
      .select('latitude, longitude')
      .eq('zip', dest_zip)
      .single();

    if (originError || destError || !originRow || !destRow) {
      return res.status(404).json({ error: 'Coordinates not found for zip(s)' });
    }

    return res.status(200).json({
      origin_latitude: originRow.latitude,
      origin_longitude: originRow.longitude,
      dest_latitude: destRow.latitude,
      dest_longitude: destRow.longitude,
    });
  } catch (err) {
    console.error('resolve-coords failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
