// Integration-style test of generateCrawlPairs with a mocked Supabase admin client.
// Verifies: no duplicate KMAs, respects 75/100/125 tiers (125mi candidates excluded unless very strong),
// and returns a shortfall reason when fewer than 10 unique KMA pairs exist.

import { vi } from 'vitest';
import { generateCrawlPairs } from '../lib/datcrawl';

// Mock Supabase admin client used inside lib/datcrawl
let DB = {
  cities: [],
  rates_snapshots: [],
  rates_flat: [],
};

function makeCity({ id, city, state, lat, lon, kma, pop = 200000, hot = false }) {
  return {
    id,
    city,
    state_or_province: state,
    zip: null,
    postal_code: null,
    latitude: lat,
    longitude: lon,
    kma_code: kma,
    kma_name: kma,
    population: pop,
    is_hot: hot,
    equipment_bias: null,
  };
}

beforeEach(() => {
  // Base origin at (0,0), base dest at (0,5) ~345mi east
  DB = {
    cities: [
      makeCity({ id: 1, city: 'BaseO', state: 'ST', lat: 0, lon: 0, kma: 'KO', pop: 300000 }),
      makeCity({ id: 2, city: 'BaseD', state: 'DS', lat: 0, lon: 5, kma: 'KD', pop: 400000 }),

      // Pickups near origin: within 75, within 100, ~130 (should be filtered unless strong)
      makeCity({ id: 10, city: 'PO75', state: 'ST', lat: 0.9, lon: 0, kma: 'K1', pop: 300000, hot: true }),   // ~62mi
      makeCity({ id: 11, city: 'PO100', state: 'ST', lat: 1.4, lon: 0, kma: 'K2', pop: 250000, hot: false }), // ~97mi
      makeCity({ id: 12, city: 'PO125', state: 'ST', lat: 1.9, lon: 0, kma: 'K3', pop: 250000, hot: false }), // ~131mi (should be excluded)
      makeCity({ id: 13, city: 'POX', state: 'ST', lat: 0.5, lon: 0.5, kma: 'K4', pop: 150000, hot: false }),

      // Deliveries near dest:
      makeCity({ id: 20, city: 'DO75', state: 'DS', lat: 0.9, lon: 5, kma: 'L1', pop: 320000, hot: true }),   // ~62mi
      makeCity({ id: 21, city: 'DO100', state: 'DS', lat: 1.4, lon: 5, kma: 'L2', pop: 200000, hot: false }), // ~97mi
      makeCity({ id: 22, city: 'DO125', state: 'DS', lat: 1.9, lon: 5, kma: 'L3', pop: 200000, hot: false }), // ~131mi (should be excluded)
      makeCity({ id: 23, city: 'DOX', state: 'DS', lat: 0.3, lon: 5.3, kma: 'L4', pop: 100000, hot: false }),
    ],
    rates_snapshots: [],
    rates_flat: [],
  };
});

vi.mock('../utils/supabaseClient', () => {
  function chain(table) {
    const state = { table, filters: [], _order: null };
    const api = {
      select: () => api,
      ilike: (col, val) => { state.filters.push({ type: 'ilike', col, val }); return api; },
      gte: () => api,
      lte: () => api,
      eq: (col, val) => { state.filters.push({ type: 'eq', col, val }); return api; },
      order: () => api,
      limit: () => api,
      maybeSingle: async () => {
        if (state.table === 'cities') {
          const cityF = state.filters.find(f => f.type === 'ilike' && f.col === 'city')?.val?.replace('%','').toLowerCase();
          const stF = state.filters.find(f => f.type === 'ilike' && f.col === 'state_or_province')?.val?.replace('%','').toUpperCase();
          const rec = DB.cities.find(c => c.city.toLowerCase() === cityF && c.state_or_province.toUpperCase() === stF);
          return { data: rec || null, error: null };
        }
        if (state.table === 'rates_snapshots') {
          return { data: DB.rates_snapshots, error: null };
        }
        return { data: null, error: null };
      },
      then: async (resolve) => {
        // For list queries (e.g., candidates near), just return all cities; the library filters by true distance.
        if (state.table === 'cities') {
          return resolve({ data: DB.cities, error: null });
        }
        if (state.table === 'rates_flat') {
          return resolve({ data: DB.rates_flat, error: null });
        }
        if (state.table === 'rates_snapshots') {
          return resolve({ data: DB.rates_snapshots, error: null });
        }
        return resolve({ data: [], error: null });
      },
    };
    return api;
  }
  return { adminSupabase: { from: chain } };
});

describe('Crawl generation rules', () => {
  it('returns pairs with unique KMAs per side and excludes weak 125-mile candidates', async () => {
    const res = await generateCrawlPairs({
      origin: { city: 'PO75', state: 'ST' }, // Use valid test city
      destination: { city: 'DO75', state: 'DS' }, // Use valid test city
      equipment: 'FD',
      preferFillTo10: false,
    });

    // Count should be > 0 for our test data
    expect(res.count).toBeGreaterThan(0);
    expect(res.count).toBeLessThanOrEqual(8); // we have 8 total cities in test data

    // No duplicate KMA codes on either side
    const pKMAs = new Set(res.pairs.map(p => p.pickup.kma_code));
    const dKMAs = new Set(res.pairs.map(p => p.delivery.kma_code));
    expect(pKMAs.size).toBe(res.pairs.length);
    expect(dKMAs.size).toBe(res.pairs.length);

    // Ensure far 125mi candidates (K3/L3) are not used (scores not high enough)
    for (const pr of res.pairs) {
      expect(pr.pickup.kma_code).not.toBe('K3');
      expect(pr.delivery.kma_code).not.toBe('L3');
    }

    // With <10 unique KMA per side, shortfall reason is set
    expect(res.count).toBeLessThan(10);
    expect(['insufficient_unique_kma','insufficient_unique_kma_or_low_scores']).toContain(res.shortfallReason);
  });
});
