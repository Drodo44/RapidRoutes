// Direct test of the row generation fix
const { rowsFromBaseAndPairs } = require('./lib/datCsvBuilder.js');

const testLane = {
  origin_city: 'Chicago', origin_state: 'IL',
  dest_city: 'Atlanta', dest_state: 'GA',
  equipment_code: 'V',
  weight_lbs: 45000,
  pickup_earliest: '2024-01-15',
  pickup_latest: '2024-01-16'
};

const baseOrigin = { city: 'Chicago', state: 'IL', zip: '60601' };
const baseDest = { city: 'Atlanta', state: 'GA', zip: '30309' };

// Test with only 2 pairs (should pad to 5)
const insufficientPairs = [
  { pickup: { city: 'Milwaukee', state: 'WI' }, delivery: { city: 'Birmingham', state: 'AL' } },
  { pickup: { city: 'Madison', state: 'WI' }, delivery: { city: 'Montgomery', state: 'AL' } }
];

console.log('Testing definitive fix...');
const rows = rowsFromBaseAndPairs(testLane, baseOrigin, baseDest, insufficientPairs, true);
console.log(`Result: ${rows.length} rows (MUST be 12)`);

if (rows.length === 12) {
  console.log('✅ FIX WORKING - Exactly 12 rows generated');
} else {
  console.log('❌ FIX FAILED - Wrong row count');
}
