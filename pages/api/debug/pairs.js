// pages/api/debug/pairs.js
// Debug endpoint (admin only expected) to inspect generated crawl pairs.
// Usage: /api/debug/pairs?origin_city=Augusta&origin_state=GA&dest_city=New%20Bedford&dest_state=MA&fill=1
// Or: /api/debug/pairs?laneId=123&fill=1

import { adminSupabase } from '../../../utils/supabaseClient';
import { planPairsForLane, MIN_PAIRS_REQUIRED, ROWS_PER_PAIR } from '../../../lib/datCsvBuilder';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { laneId, origin_city, origin_state, dest_city, dest_state } = req.query;
    const preferFillTo10 = String(req.query.fill || '1') !== '0';

    let lane = null;
    if (laneId) {
      const { data, error } = await adminSupabase.from('lanes').select('*').eq('id', laneId).limit(1);
      if (error) return res.status(500).json({ error: error.message });
      lane = data?.[0] || null;
      if (!lane) return res.status(404).json({ error: 'Lane not found' });
    } else if (origin_city && dest_city && origin_state && dest_state) {
      // Build a minimal lane-like object for testing
      lane = {
        id: 'debug-1',
        origin_city: String(origin_city),
        origin_state: String(origin_state),
        dest_city: String(dest_city),
        dest_state: String(dest_state),
        equipment_code: req.query.equipment || 'FD',
        pickup_earliest: req.query.pickup_earliest || '',
        pickup_latest: req.query.pickup_latest || '',
        length_ft: req.query.length_ft || 48,
        weight_lbs: req.query.weight_lbs || 47000,
        full_partial: req.query.full_partial || 'full',
        commodity: req.query.commodity || '',
        comment: req.query.comment || ''
      };
    } else {
      return res.status(400).json({ error: 'Provide laneId or origin_city,origin_state,dest_city,dest_state' });
    }

    // Run the planner to get pairs
    const crawl = await planPairsForLane(lane, { preferFillTo10, usedCities: new Set() });

    // Provide a clear debug response
    return res.status(200).json({
      laneId: lane.id,
      origin: crawl.baseOrigin,
      destination: crawl.baseDest,
      preferFillTo10,
      pairs: (crawl.pairs || []).map((p) => ({ pickup: p.pickup, delivery: p.delivery, score: p.score, synthetic: !!p.synthetic })),
      pairCount: (crawl.pairs || []).length
    });
  } catch (err) {
    console.error('Debug pairs error:', err);
    return res.status(500).json({ error: err.message || 'Failed to generate debug pairs' });
  }
}
