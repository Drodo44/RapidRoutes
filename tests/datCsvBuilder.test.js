import { DAT_HEADERS } from '../lib/datHeaders.js';
import { ensureLaneWeightValidity, rowsFromBaseAndPairs, toCsv, chunkRows } from '../lib/datCsvBuilder';

function baseLane(overrides = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    origin_city: 'Cincinnati',
    origin_state: 'OH',
    origin_zip: '45202',
    dest_city: 'Chicago',
    dest_state: 'IL',
    dest_zip: '60601',
    equipment_code: 'FD',
    length_ft: 48,
    weight_lbs: 42000,
    randomize_weight: false,
    weight_min: null,
    weight_max: null,
    full_partial: 'full',
    pickup_earliest: '8/12/2025',
    pickup_latest: '8/13/2025',
    commodity: 'Steel',
    comment: 'No tarps',
    ...overrides,
  };
}

const baseOrigin = { city: 'Cincinnati', state: 'OH', zip: '45202' };
const baseDest = { city: 'Chicago', state: 'IL', zip: '60601' };
const dummyPairs = Array.from({ length: 10 }).map((_, i) => ({
  pickup: { city: `P${i}`, state: 'OH', zip: '' },
  delivery: { city: `D${i}`, state: 'IL', zip: '' },
}));

describe('DAT CSV Builder', () => {
  it('has exact 24 headers in order', () => {
    expect(DAT_HEADERS).toHaveLength(24);
    expect(DAT_HEADERS[0]).toBe('Pickup Earliest*');
    expect(DAT_HEADERS[23]).toBe('Reference ID (unique per organization; max 8 chars)');
  });

  it('requires weight when randomize OFF; accepts valid randomize range', () => {
    // Missing weight with randomize off throws
    expect(() => ensureLaneWeightValidity(baseLane({ weight_lbs: null }))).toThrow();

    // Invalid random range throws
    expect(() => ensureLaneWeightValidity(baseLane({ randomize_weight: true, weight_min: 50000, weight_max: 40000 }))).toThrow();

    // Valid random range passes
    expect(() => ensureLaneWeightValidity(baseLane({ randomize_weight: true, weight_min: 38000, weight_max: 43000 }))).not.toThrow();
  });

  it('builds 22 rows per lane (1 base + 10 pairs, x2 contact methods)', () => {
    const lane = baseLane();
    const rows = rowsFromBaseAndPairs(lane, baseOrigin, baseDest, dummyPairs);
    expect(rows).toHaveLength(22);
  });

  it('randomized weight falls within min..max', () => {
    const lane = baseLane({ randomize_weight: true, weight_min: 38000, weight_max: 43000, weight_lbs: null });
    // Stabilize randomness for test repeatability
    const orig = Math.random;
    Math.random = () => 0.5; // midpoint
    const rows = rowsFromBaseAndPairs(lane, baseOrigin, baseDest, dummyPairs);
    Math.random = orig;

    for (const r of rows) {
      const w = Number(r['Weight (lbs)*']);
      expect(w).toBeGreaterThanOrEqual(38000);
      expect(w).toBeLessThanOrEqual(43000);
    }
  });

  it('CSV escaping is safe and chunking splits into <=499 rows', () => {
    const lane = baseLane({ comment: 'Note with, comma and "quotes"' });
    const rows = rowsFromBaseAndPairs(lane, baseOrigin, baseDest, dummyPairs);
    const csv = toCsv(DAT_HEADERS, rows);
    expect(csv.split('\n').length).toBeGreaterThan(1);
    expect(csv).toContain('""quotes""'); // quotes escaped

    const big = Array.from({ length: 1000 }).map((_, i) => rows[i % rows.length]);
    const chunks = chunkRows(big, 499);
    expect(chunks.length).toBe(3);
    expect(chunks[0]).toHaveLength(499);
    expect(chunks[1]).toHaveLength(499);
    expect(chunks[2]).toHaveLength(2);
  });
});
