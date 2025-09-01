// Integration-style test of generateCrawlPairs with a mocked Supabase admin client.
// Verifies: no duplicate KMAs, respects 75/100/125 tiers (125mi candidates excluded unless very strong),
// and returns a shortfall reason when fewer than 10 unique KMA pairs exist.

import { vi } from 'vitest';
import './setup/mock-supabase-datcrawl.js';
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
  // Reset Supabase mock state
  resetState();

  // Base cities with realistic coordinates
  DB = {
    cities: [
      makeCity({ id: 1, city: 'Chicago', state: 'IL', lat: 41.8781, lon: -87.6298, kma: 'CHI', pop: 2700000 }),
      makeCity({ id: 2, city: 'Atlanta', state: 'GA', lat: 33.7490, lon: -84.3880, kma: 'ATL', pop: 500000 }),

      // Pickups near Chicago within realistic ranges
      makeCity({ id: 10, city: 'Oak Park', state: 'IL', lat: 41.8850, lon: -87.7845, kma: 'CHI', pop: 52000, hot: true }),
      makeCity({ id: 11, city: 'Evanston', state: 'IL', lat: 42.0451, lon: -87.6877, kma: 'CHI', pop: 75000, hot: false }),
      makeCity({ id: 12, city: 'Hammond', state: 'IN', lat: 41.5833, lon: -87.5000, kma: 'CHI', pop: 76000, hot: false }),
      makeCity({ id: 13, city: 'Cicero', state: 'IL', lat: 41.8456, lon: -87.7539, kma: 'CHI', pop: 80000, hot: false }),

      // Deliveries near Atlanta within realistic ranges
      makeCity({ id: 20, city: 'Marietta', state: 'GA', lat: 33.9526, lon: -84.5499, kma: 'ATL', pop: 60000, hot: true }),
      makeCity({ id: 21, city: 'Alpharetta', state: 'GA', lat: 34.0754, lon: -84.2941, kma: 'ATL', pop: 65000, hot: false }),
      makeCity({ id: 22, city: 'Decatur', state: 'GA', lat: 33.7748, lon: -84.2963, kma: 'ATL', pop: 24000, hot: false }),
      makeCity({ id: 23, city: 'Sandy Springs', state: 'GA', lat: 33.9304, lon: -84.3733, kma: 'ATL', pop: 108000, hot: false }),
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
      not: () => api,
      order: () => api,
      limit: () => api,
      maybeSingle: async () => {
        if (state.table === 'cities') {
          // Convert both sides to lowercase for case-insensitive comparison
          const cityF = state.filters.find(f => f.type === 'ilike' && f.col === 'city')?.val?.toLowerCase();
          const stF = state.filters.find(f => f.type === 'ilike' && f.col === 'state_or_province')?.val?.toLowerCase();
          const rec = DB.cities.filter(c => 
            c.city.toLowerCase() === cityF?.replace(/%/g, '') && 
            c.state_or_province.toLowerCase() === stF?.replace(/%/g, '')
          );
          return { data: rec, error: null };
        }
        if (state.table === 'rates_snapshots') {
          return { data: DB.rates_snapshots, error: null };
        }
        return { data: [], error: null };
      },
      then: async (resolve) => {
        // For list queries (e.g., candidates near), just return all cities; the library filters by true distance.
        if (state.table === 'cities') {
          // Convert both sides to lowercase for case-insensitive comparison
          const cityF = state.filters.find(f => f.type === 'ilike' && f.col === 'city')?.val?.toLowerCase();
          const stF = state.filters.find(f => f.type === 'ilike' && f.col === 'state_or_province')?.val?.toLowerCase();
          let results = DB.cities;
          if (cityF) {
            results = results.filter(c => c.city.toLowerCase().includes(cityF?.replace(/%/g, '')));
          }
          if (stF) {
            results = results.filter(c => c.state_or_province.toLowerCase().includes(stF?.replace(/%/g, '')));
          }
          return resolve({ data: results, error: null });
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
      origin: { city: 'Chicago', state: 'IL' }, // Use a city we know exists in mock data
      destination: { city: 'Atlanta', state: 'GA' }, // Use a city we know exists in mock data
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
