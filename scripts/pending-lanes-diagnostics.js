#!/usr/bin/env node
/**
 * Pending Lanes Diagnostics
 * - Fetch 4 pending lanes from Supabase (status='pending')
 * - Run enterpriseValidation.validateLane
 * - Attempt intelligent pairing via intelligentCache.getIntelligentPairs
 * - Try generateDatCsvRows and report whether dropped before/after CSV building
 */

import { adminSupabase as supabase } from '../utils/supabaseClient.js';
import { validateLane } from '../lib/enterpriseValidation.js';
import { intelligentCache } from '../lib/intelligentCache.js';
import { generateDatCsvRows } from '../lib/datCsvBuilder.js';

function safe(v) { try { return JSON.stringify(v); } catch { return String(v); } }

async function fetchPendingLanes(limit = 4) {
  const { data, error } = await supabase
    .from('lanes')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error('Failed to fetch pending lanes: ' + error.message);
  return data || [];
}

async function diagnoseLane(lane) {
  const report = {
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

  // 1) Validate
  try {
    await validateLane(lane);
    report.validate.passed = true;
  } catch (err) {
    report.validate.passed = false;
    report.validate.error = err.message;
    // Even on validation fail, we still proceed to pairing attempt to show diagnostics
  }

  // 2) Pairing attempt
  try {
    report.pairing.attempted = true;
    const result = await intelligentCache.getIntelligentPairs(
      { city: lane.origin_city, state: lane.origin_state, zip: lane.origin_zip },
      { city: lane.dest_city, state: lane.dest_state, zip: lane.dest_zip },
      lane.equipment_code,
      lane.id
    );
    const pairs = Array.isArray(result?.pairs) ? result.pairs : [];
    report.pairing.pairs = pairs.length;
    report.pairing.source = result?.source || null;
    report.pairing.here_fallback = (result?.source || '').toLowerCase().includes('here');
  } catch (err) {
    report.pairing.error = err.message;
  }

  // 3) CSV generation attempt
  try {
    const rows = await generateDatCsvRows({ ...lane });
    report.csv.built = true;
    report.csv.rows = Array.isArray(rows) ? rows.length : 0;
    report.csv.droppedStage = report.csv.rows > 0 ? 'not_dropped' : 'after_builder_min_pairs';
  } catch (err) {
    report.csv.error = err.message;
    // Try to infer drop stage from error message
    if (/minimum\s+\d+\s+valid\s+pairs/i.test(err.message)) {
      report.csv.droppedStage = 'after_builder_min_pairs';
    } else if (/Equipment weight validation/i.test(err.message)) {
      report.csv.droppedStage = 'before_builder_weight_limit';
    } else {
      report.csv.droppedStage = 'builder_runtime_error';
    }
  }

  return report;
}

(async () => {
  console.log('🧪 Pending Lanes Diagnostics: starting...');
  try {
    const lanes = await fetchPendingLanes(4);
    console.log(`Found ${lanes.length} pending lanes.`);

    const results = [];
    for (const lane of lanes) {
      console.log(`\n--- Lane ${lane.id} (${lane.equipment_code}) ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state} ---`);
      const r = await diagnoseLane(lane);
      results.push(r);
      console.log(`Validation: ${r.validate.passed ? 'PASSED' : 'FAILED'}${r.validate.error ? ' - ' + r.validate.error : ''}`);
      console.log(`Pairing attempted: ${r.pairing.attempted}, pairs: ${r.pairing.pairs}, source: ${r.pairing.source || 'n/a'}`);
      console.log(`CSV: ${r.csv.built ? 'BUILT' : 'NOT BUILT'}, rows: ${r.csv.rows}, droppedStage: ${r.csv.droppedStage}${r.csv.error ? ' - ' + r.csv.error : ''}`);
    }

    console.log('\n\n📋 Summary');
    for (const r of results) {
      console.log(`• Lane ${r.id} | ${r.route} | ${r.equipment} | weight ${r.weight_lbs}${r.randomize_weight ? ` (random ${r.weight_min}-${r.weight_max})` : ''}`);
      console.log(`  - validate: ${r.validate.passed ? 'PASS' : 'FAIL'}${r.validate.error ? ' | ' + r.validate.error : ''}`);
      console.log(`  - pairing: attempted=${r.pairing.attempted}, pairs=${r.pairing.pairs}, source=${r.pairing.source || 'n/a'}${r.pairing.error ? ' | ' + r.pairing.error : ''}`);
      console.log(`  - csv: built=${r.csv.built}, rows=${r.csv.rows}, dropped=${r.csv.droppedStage}${r.csv.error ? ' | ' + r.csv.error : ''}`);
    }
  } catch (e) {
    console.error('Diagnostics failed:', e.message);
  }
})();
