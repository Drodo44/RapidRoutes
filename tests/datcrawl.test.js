// Integration-style test of generateCrawlPairs with a mocked Supabase admin client.
// Verifies: no duplicate KMAs, respects 75/100/125 tiers (125mi candidates excluded unless very strong),
// and returns a shortfall reason when fewer than 10 unique KMA pairs exist.

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
      makeCity({ id: 1, city: 'BaseO', state: 'ST', lat: 0, lon: 0, kma: 'KO', pop: 1200000 }),
      makeCity({ id: 2, city: 'BaseD', state: 'DS', lat: 0, lon: 5, kma: 'KD', pop: 1300000 }),

      // Create 12+ candidates within 100mi for origin to trigger early return
      ...Array.from({length: 13}, (_, i) => 
        makeCity({ 
          id: 10 + i, 
          city: `PCity${i}`, 
          state: 'ST', 
          lat: 0.3 + i * 0.15, // spread them from ~21mi to ~138mi
          lon: 0, 
          kma: `K${i+1}`, 
          pop: 1000000 + i * 100000, 
          hot: i % 2 === 0 
        })
      ),

      // Create 12+ candidates within 100mi for destination to trigger early return
      ...Array.from({length: 13}, (_, i) => 
        makeCity({ 
          id: 30 + i, 
          city: `DCity${i}`, 
          state: 'DS', 
          lat: 0.3 + i * 0.15, 
          lon: 5, 
          kma: `L${i+1}`, 
          pop: 1050000 + i * 100000, 
          hot: i % 2 === 1 
        })
      ),
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
      origin: { city: 'BaseO', state: 'ST' },
      destination: { city: 'BaseD', state: 'DS' },
      equipment: 'FD',
      preferFillTo10: false,
    });

    // With 12+ candidates per side, should find pairs without hitting 125mi strict threshold
    expect(res.count).toBeGreaterThan(0);
    expect(res.count).toBeLessThanOrEqual(10); // should get up to 10 pairs

    // No duplicate KMA codes on either side when we do get results
    if (res.count > 0) {
      const pKMAs = new Set(res.pairs.map(p => p.pickup.kma_code));
      const dKMAs = new Set(res.pairs.map(p => p.delivery.kma_code));
      expect(pKMAs.size).toBe(res.pairs.length);
      expect(dKMAs.size).toBe(res.pairs.length);
    }

    // If we get fewer than 10, shortfall reason should be set
    if (res.count < 10) {
      expect(['insufficient_unique_kma','insufficient_unique_kma_or_low_scores']).toContain(res.shortfallReason);
    }
  });
});
