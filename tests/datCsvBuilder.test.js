import { DAT_HEADERS } from '../lib/datHeaders.js';
import { validateEquipmentWeight, generateDatCsvRows, toCsv, chunkRows, ensureLaneWeightValidity, rowsFromBaseAndPairs } from '../lib/datCsvBuilder.js';

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

describe('DAT CSV Builder Tests', () => {
    describe('Weight Validation', () => {
        it('validates fixed weight within equipment limits', () => {
            const lane = baseLane();
            expect(() => validateEquipmentWeight(lane)).not.toThrow();
        });

        it('throws error for fixed weight exceeding equipment limit', () => {
            const lane = baseLane({
                equipment_code: 'V',
                weight_lbs: 50000
            });
            expect(() => validateEquipmentWeight(lane)).toThrow(/exceeds maximum/);
        });

        it('validates randomized weight range', () => {
            const lane = baseLane({
                randomize_weight: true,
                weight_min: 40000,
                weight_max: 45000,
                weight_lbs: null
            });
            expect(() => validateEquipmentWeight(lane)).not.toThrow();
        });

        it('throws error for invalid randomized weight range', () => {
            const lane = baseLane({
                equipment_code: 'V',
                randomize_weight: true,
                weight_min: 46000,
                weight_max: 50000,
                weight_lbs: null
            });
            expect(() => validateEquipmentWeight(lane)).toThrow(/exceeds limit/);
        });

        it('swaps min and max weights if reversed', () => {
            const lane = baseLane({
                randomize_weight: true,
                weight_min: 45000,
                weight_max: 40000,
                weight_lbs: null
            });
            validateEquipmentWeight(lane);
            expect(Number(lane.weight_min)).toBeLessThan(Number(lane.weight_max));
        });
    });

    describe('DAT CSV Generation', () => {
        it('has exact 24 headers in order', () => {
            expect(DAT_HEADERS).toHaveLength(24);
            expect(DAT_HEADERS[0]).toBe('Pickup Earliest*');
            expect(DAT_HEADERS[23]).toBe('Reference ID (unique per organization; max 8 chars)');
        });

        it('requires weight when randomize OFF; accepts valid randomize range', () => {
            expect(() => ensureLaneWeightValidity(baseLane({ weight_lbs: null }))).toThrow();
            expect(() => ensureLaneWeightValidity(baseLane({ 
                randomize_weight: true, 
                weight_min: 50000, 
                weight_max: 40000 
            }))).toThrow();
            expect(() => ensureLaneWeightValidity(baseLane({ 
                randomize_weight: true, 
                weight_min: 38000, 
                weight_max: 43000 
            }))).not.toThrow();
        });

        it('builds at least 12 rows per lane (6 pairs x2 contact methods)', () => {
            const lane = baseLane();
            const rows = rowsFromBaseAndPairs(lane, baseOrigin, baseDest, dummyPairs);
            expect(rows.length).toBeGreaterThanOrEqual(12);
        });

        it('randomized weight falls within min..max', () => {
            const lane = baseLane({ 
                randomize_weight: true, 
                weight_min: 38000, 
                weight_max: 43000, 
                weight_lbs: null 
            });
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

        it('generates valid CSV format with proper escaping', () => {
            const lane = baseLane({ comment: 'Note with, comma and "quotes"' });
            const rows = rowsFromBaseAndPairs(lane, baseOrigin, baseDest, dummyPairs);
            const csv = toCsv(DAT_HEADERS, rows);
            expect(csv.split('\r\n').length).toBeGreaterThan(1);
            expect(csv).toContain('""quotes""'); // quotes escaped
        });

        it('chunks rows into correct sizes', () => {
            const rows = Array(600).fill({ dummy: 'row' });
            const chunks = chunkRows(rows);
            expect(chunks.length).toBe(2);
            expect(chunks[0].length).toBe(499);
            expect(chunks[1].length).toBe(101);
        });

        it('enforces unique reference IDs', () => {
            const lane = baseLane();
            const rows = rowsFromBaseAndPairs(lane, baseOrigin, baseDest, dummyPairs);
            const refIds = new Set(rows.map(r => r['Reference ID']));
            expect(refIds.size).toBe(rows.length);
            for (const id of refIds) {
                expect(id).toMatch(/^RR\d{5}$/);
            }
        });
    });
});
