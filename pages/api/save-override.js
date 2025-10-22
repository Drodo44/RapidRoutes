// pages/api/save-override.js
// Upserts a manual pairing override for origin or destination selection
import supabaseAdmin from "@/lib/supabaseAdmin";

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const userId = req.headers['x-rr-user-id'];
    if (!userId) return res.status(401).json({ error: 'Missing user context' });

    const { laneId, type, chosenCity, chosenState, chosenZip3, chosenKma, distanceMiles } = req.body || {};
    if (!laneId || !type || !chosenCity || !chosenState) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!['origin','destination'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    const payload = {
      user_id: userId,
      lane_id: laneId,
      type,
      chosen_city: chosenCity,
      chosen_state: chosenState,
      chosen_zip3: chosenZip3 || null,
      chosen_kma: chosenKma || null,
      distance_miles: Number.isFinite(distanceMiles) ? Math.round(distanceMiles) : null,
    };

    const { data, error } = await adminSupabase
      .from('pairing_overrides')
      .upsert(payload, { onConflict: 'lane_id,type,user_id' })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true, override: data });
  } catch (err) {
    console.error('[save-override] error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}