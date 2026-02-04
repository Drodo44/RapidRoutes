import { validateLane } from '../lib/enterpriseValidation.js';

const samples = [
  { label: 'ISO full', pickup_earliest: '2025-09-16T00:00:00.000Z', pickup_latest: '2025-09-16T12:30:00.000Z' },
  { label: 'ISO date only', pickup_earliest: '2025-09-16', pickup_latest: '2025-09-17' },
  { label: 'Legacy format', pickup_earliest: '9/16/2025', pickup_latest: '9/17/2025' },
  { label: 'ISO no ms Z', pickup_earliest: '2025-09-16T00:00:00Z', pickup_latest: '2025-09-16T05:00:00Z' },
  { label: 'ISO with offset', pickup_earliest: '2025-09-16T00:00:00+00:00', pickup_latest: '2025-09-16T06:00:00+00:00' },
  { label: 'Invalid nonsense', pickup_earliest: '2025/16/09', pickup_latest: '2025-13-40' },
];

function baseLane() {
  return {
    id: 'L1',
    origin_city: 'Cincinnati',
    origin_state: 'OH',
    dest_city: 'Chicago',
    dest_state: 'IL',
    equipment_code: 'V',
    length_ft: 53,
    weight_lbs: 40000,
    full_partial: 'full'
  };
}

for (const sample of samples) {
  const lane = { ...baseLane(), pickup_earliest: sample.pickup_earliest, pickup_latest: sample.pickup_latest };
  try {
    validateLane(lane);
    console.log(`✅ ${sample.label} passed`);
  } catch (e) {
    console.log(`❌ ${sample.label} failed:`, e.message);
  }
}
