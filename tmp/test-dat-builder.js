const { planPairsForLane, rowsFromBaseAndPairs, toCsv, DAT_HEADERS } = require('../lib/datCsvBuilder');

(async () => {
  try {
    const lane = {
      id: 12345,
      origin_city: 'Maplesville',
      origin_state: 'AL',
      dest_city: 'Birmingham',
      dest_state: 'AL',
      equipment_code: 'FD',
      length_ft: 48,
      pickup_earliest: '2025-09-15',
      pickup_latest: '2025-09-16',
      randomize_weight: false,
      weight_lbs: 45000,
      reference_id: 'RR12345'
    };

    // Mock a small set of pairs
    const baseOrigin = { city: lane.origin_city, state: lane.origin_state };
    const baseDest = { city: lane.dest_city, state: lane.dest_state };
    const pairs = [
      { pickup: baseOrigin, delivery: baseDest, score: 0.8 },
      { pickup: { city: 'Selma', state: 'AL' }, delivery: { city: 'Tuscaloosa', state: 'AL' }, score: 0.6 },
      { pickup: { city: 'Montgomery', state: 'AL' }, delivery: { city: 'Mobile', state: 'AL' }, score: 0.5 }
    ];

    const rows = rowsFromBaseAndPairs(lane, baseOrigin, baseDest, pairs, true);
    console.log('Generated rows count:', rows.length);
    console.log('Sample rows refs:', rows.slice(0,6).map(r => r['Reference ID']));

    const csv = toCsv(DAT_HEADERS, rows);
    console.log('CSV first lines:\n', csv.split('\r\n').slice(0,5).join('\n'));
  } catch (e) {
    console.error('Test failed:', e);
    process.exit(1);
  }
})();
