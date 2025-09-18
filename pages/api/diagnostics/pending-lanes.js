// pages/api/diagnostics/pending-lanes.js
// Produces lane-by-lane diagnostics for pending lanes:
// - enterpriseValidation.validateLane result (pass/fail + reason)
// - Intelligence pairing attempted and pair count
// - Whether lane was dropped before or after CSV building

import { adminSupabase as supabase } from '../../../utils/supabaseClient.js';
import { validateLane } from '../../../lib/enterpriseValidation.js';
import { intelligentCache } from '../../../lib/intelligentCache.js';
import { generateDatCsvRows } from '../../../lib/datCsvBuilder.js';

function inferDropStageFromError(message) {
  if (!message) return 'unknown_error';
  if (/minimum\s+\d+\s+valid\s+pairs/i.test(message)) return 'after_builder_min_pairs';
  if (/Equipment weight validation/i.test(message)) return 'before_builder_weight_limit';
  if (/Maximum weight .* exceeds limit/i.test(message)) return 'before_builder_weight_limit';
  return 'builder_runtime_error';
}

async function fetchPendingLanes(limit = 4) {
  const { data, error } = await supabase
    .from('lanes')
    .select('id, origin_city, origin_state, origin_zip, dest_city, dest_state, dest_zip, equipment_code, length_ft, weight_lbs, randomize_weight, weight_min, weight_max, full_partial, pickup_earliest, pickup_latest, commodity, comment, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function diagnoseLane(lane) {
  const base = {
    id: lane.id,
    route: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`,
    equipment: lane.equipment_code,
    weight_lbs: lane.weight_lbs,
    randomize_weight: !!lane.randomize_weight,
    weight_min: lane.weight_min,
    weight_max: lane.weight_max,
    validate: { passed: false, error: null },
    pairing: { attempted: false, pairs: 0, source: null, here_fallback: false, error: null },
    csv: { built: false, rows: 0, droppedStage: null, error: null }
  };

  // 1) Validation
  try {
    validateLane(lane);
    base.validate.passed = true;
  } catch (err) {
    base.validate.passed = false;
    base.validate.error = err?.message || String(err);
  }

  // 2) Intelligence pairing
  try {
    base.pairing.attempted = true;
    const result = await intelligentCache.getIntelligentPairs(
      { city: lane.origin_city, state: lane.origin_state, zip: lane.origin_zip },
      { city: lane.dest_city, state: lane.dest_state, zip: lane.dest_zip },
      lane.equipment_code,
      lane.id
    );
    const pairs = Array.isArray(result?.pairs) ? result.pairs : [];
    base.pairing.pairs = pairs.length;
    base.pairing.source = result?.source || null;
    base.pairing.here_fallback = (result?.source || '').toLowerCase().includes('here');
  } catch (err) {
    base.pairing.error = err?.message || String(err);
  }

  // 3) CSV building
  try {
    const rows = await generateDatCsvRows({ ...lane });
    base.csv.built = true;
    base.csv.rows = Array.isArray(rows) ? rows.length : 0;
    base.csv.droppedStage = base.csv.rows > 0 ? 'not_dropped' : 'after_builder_min_pairs';
  } catch (err) {
    base.csv.error = err?.message || String(err);
    base.csv.droppedStage = inferDropStageFromError(base.csv.error);
  }

  return base;
}

export default async function handler(req, res) {
  try {
    const limit = Math.max(1, Math.min(10, Number(req.query.limit) || 4));
    const lanes = await fetchPendingLanes(limit);
    const results = [];
    for (const lane of lanes) {
      // Ensure strings for dates to avoid timezone issues in downstream logic
      if (lane.pickup_earliest) lane.pickup_earliest = String(lane.pickup_earliest);
      if (lane.pickup_latest) lane.pickup_latest = String(lane.pickup_latest);
      const r = await diagnoseLane(lane);
      results.push(r);
    }
    res.status(200).json({
      ok: true,
      count: results.length,
      lanes: results,
      meta: { now: new Date().toISOString() }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
}
