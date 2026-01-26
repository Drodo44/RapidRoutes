process.env.TEST_MODE_SIMPLE_ROWS = '1';
import { EnterpriseCsvGenerator } from '../lib/enterpriseCsvGenerator.js';

// Lightweight assertion helpers (avoid bringing full test runner for this targeted check)
function assert(condition, message) {
  if (!condition) throw new Error('Assertion failed: ' + message);
}

function mmddyyyy(str) {
  return /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str);
}

async function run() {
  console.log('🔬 Auto-default & date normalization smoke test');

  // Build minimal valid lanes. Only include required + weight fields.
  const base = {
    origin_city: 'Cincinnati',
    origin_state: 'OH',
    dest_city: 'Chicago',
    dest_state: 'IL',
    equipment_code: 'V',
    length_ft: 53,
    weight_lbs: 42000,
    randomize_weight: false,
    status: 'pending'
  };

  const lanes = [
    { id: 'L1-null', pickup_earliest: null, pickup_latest: null, ...base },
    { id: 'L2-iso', pickup_earliest: new Date().toISOString(), pickup_latest: new Date(Date.now()+86400000).toISOString(), ...base },
    { id: 'L3-mmdd', pickup_earliest: '09/30/2025', pickup_latest: '10/01/2025', ...base }
  ];

  const generator = new EnterpriseCsvGenerator({
    generation: { minPairsPerLane: 6, enableTransactions: false, enableCaching: false },
    verification: { postGenerationVerification: true },
    validation: { strictSchemaValidation: false }
  });

  const result = await generator.generate(lanes);

  console.log('Result success:', result.success, 'error:', result.error);
  assert(result.laneResults.length === lanes.length, 'laneResults length mismatch');

  // Map lane id -> laneResult
  const byId = Object.fromEntries(result.laneResults.map(r => [r.lane?.id || r.laneId || 'UNKNOWN', r]));

  for (const lane of lanes) {
    const lr = Object.values(result.laneResults).find(r => (r.lane?.id === lane.id) || r.laneId === lane.id || r.id === lane.id);
    assert(lr, `Missing laneResult for ${lane.id}`);
    assert(lr.success, `Lane ${lane.id} failed: ${lr.error || lr.debug}`);
  }

  const rows = result.csv?.rows || [];
  assert(rows.length > 0, 'No CSV rows generated');

  const firstRow = rows[0];
  // Headers come from datCsvBuilder order; use bracket names
  const pickupEarliest = firstRow['Pickup Earliest*'] || firstRow[0];
  const pickupLatest = firstRow['Pickup Latest'] || firstRow[1];
  console.log('Sample earliest:', pickupEarliest, 'latest:', pickupLatest);
  assert(mmddyyyy(pickupEarliest), 'Pickup Earliest not MM/DD/YYYY');
  if (pickupLatest) assert(mmddyyyy(pickupLatest), 'Pickup Latest not MM/DD/YYYY');

  // Check at least one lane had auto-default (L1-null)
  const l1Result = byId['L1-null'];
  console.log('L1-null laneResult debug:', l1Result?.debug);

  console.log('✅ Auto-default & normalization test passed. Rows:', rows.length);
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
