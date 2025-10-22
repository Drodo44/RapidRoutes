// pages/api/load-city-choices.js
// Load saved city choices for lanes

import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const laneIds = req.method === 'POST' ? req.body.lane_ids : req.query.lane_ids?.split(',');

    if (!laneIds || laneIds.length === 0) {
      return res.status(400).json({ error: 'lane_ids required' });
    }

    const { data, error } = await supabase
      .from('lane_city_choices')
      .select('*')
      .in('lane_id', laneIds);

    if (error) {
      console.error('[Load City Choices] Database error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('[Load City Choices] Found', data.length, 'saved choices for', laneIds.length, 'lanes');

    return res.status(200).json({
      ok: true,
      choices: data,
      count: data.length
    });

  } catch (error) {
    console.error('[Load City Choices] Unexpected error:', error);
    return res.status(500).json({ error: error.message });
  }
}
