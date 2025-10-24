// pages/api/updateDatMaps.js
import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Call the fetchDatBlog API endpoint to update maps
    const fetchResponse = await fetch(new URL('/api/fetchDatBlog', req.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!fetchResponse.ok) {
      const errorData = await fetchResponse.json();
      throw new Error(errorData.error || 'Failed to fetch DAT maps');
    }

    const result = await fetchResponse.json();

    // Get the most recent maps after the update
    const { data: maps, error } = await supabaseAdmin
      .from('dat_maps')
      .select('effective_date, equipment, image_path')
      .order('effective_date', { ascending: false })
      .limit(20);

    if (error) throw error;

    // Group maps by equipment type, keeping only the most recent for each
    const latestMaps = {};
    for (const map of maps) {
      const equipment = map.equipment;
      if (!latestMaps[equipment] || map.effective_date > latestMaps[equipment].effective_date) {
        latestMaps[equipment] = map;
      }
    }

    return res.status(200).json({
      update: result,
      latestMaps: Object.values(latestMaps),
    });
  } catch (error) {
    console.error('Update DAT Maps error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update DAT maps' });
  }
}
