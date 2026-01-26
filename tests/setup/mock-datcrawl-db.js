// tests/setup/mock-datcrawl-db.js
import { vi } from 'vitest';

let DB = {
  cities: [
    // Test Cities
    {
      city: 'Cincinnati',
      state_or_province: 'OH',
      zip: '45202',
      latitude: 39.1031,
      longitude: -84.5120,
      kma: 'CVG',
      kma_name: 'Cincinnati',
      test: true
    },
    {
      city: 'Chicago',
      state_or_province: 'IL',
      zip: '60601',
      latitude: 41.8781,
      longitude: -87.6298,
      kma: 'CHI',
      kma_name: 'Chicago',
      test: true
    },
    {
      city: 'Columbus',
      state_or_province: 'OH',
      zip: '43215',
      latitude: 39.9612,
      longitude: -82.9988,
      kma: 'CMH',
      kma_name: 'Columbus',
      test: true
    },
    // Add more test cities near Chicago and Cincinnati for finding nearby pairs
    {
      city: 'Hammond',
      state_or_province: 'IN',
      zip: '46320',
      latitude: 41.5869,
      longitude: -87.5004,
      kma: 'CHI',
      kma_name: 'Chicago',
      test: true
    },
    {
      city: 'Gary',
      state_or_province: 'IN',
      zip: '46402',
      latitude: 41.5933,
      longitude: -87.3464,
      kma: 'CHI',
      kma_name: 'Chicago',
      test: true
    },
    {
      city: 'Aurora',
      state_or_province: 'IL',
      zip: '60506',
      latitude: 41.7606,
      longitude: -88.3201,
      kma: 'CHI',
      kma_name: 'Chicago',
      test: true
    },
    {
      city: 'Joliet',
      state_or_province: 'IL',
      zip: '60431',
      latitude: 41.5250,
      longitude: -88.0817,
      kma: 'CHI',
      kma_name: 'Chicago',
      test: true
    }
  ],
  rates_snapshots: [],
  rates_flat: [],
};

export function makeCity({ id, city, state, lat, lon, kma, pop = 200000, hot = false }) {
  return {
    id,
    city,
    state_or_province: state,
    zip: null,
    postal_code: null,
    latitude: lat,
    longitude: lon,
    kma,
    kma_name: kma,
    population: pop,
    is_hot: hot,
    equipment_bias: null,
    test: true,
  };
}

export function resetDatDB() {
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
}

function chain(table) {
  const state = { table, filters: [], _order: null };
  const data = {
    cities: DB.cities,
    rates_snapshots: DB.rates_snapshots,
    rates_flat: DB.rates_flat,
    operation_logs: [],
  };

  const api = {
    // Basic query operations
    select: () => api,
    insert: (records) => {
      if (Array.isArray(records)) {
        data[state.table] = [...(data[state.table] || []), ...records];
      } else {
        data[state.table] = [...(data[state.table] || []), records];
      }
      return Promise.resolve({ data: records, error: null });
    },
    upsert: async (records) => {
      if (Array.isArray(records)) {
        data[state.table] = [...(data[state.table] || []), ...records];
      } else {
        data[state.table] = [...(data[state.table] || []), records];
      }
      return { data: records, error: null };
    },
    delete: () => {
      if (state.table === 'cities') {
        // Delete should handle filters for 'in' and 'eq' conditions
        DB[state.table] = DB[state.table].filter(record => {
          // Handle 'in' filters
          const inFilters = state.filters.filter(f => f.type === 'in');
          const eqFilters = state.filters.filter(f => f.type === 'eq');
          
          for (const filter of inFilters) {
            if (filter.val.includes(record[filter.col])) {
              return false;
            }
          }
          
          for (const filter of eqFilters) {
            if (record[filter.col] === filter.val) {
              return false;
            }
          }
          
          return true;
        });
      }
      return Promise.resolve({ data: null, error: null });
    },
    update: () => api,

    // Filters
    ilike: (col, val) => { state.filters.push({ type: 'ilike', col, val }); return api; },
    eq: (col, val) => { state.filters.push({ type: 'eq', col, val }); return api; },
    neq: () => api,
    gt: () => api,
    gte: () => api,
    lt: () => api,
    lte: () => api,
    in: () => api,
    contains: () => api,
    containedBy: () => api,
    filter: () => api,
    not: () => api,

    // Query modifiers
    limit: () => api,
    single: () => api,
    maybeSingle: async () => {
      if (state.table === 'cities') {
        // Convert both sides to lowercase for case-insensitive comparison
        const cityF = state.filters.find(f => f.type === 'ilike' && f.col === 'city')?.val?.toLowerCase();
        const stF = state.filters.find(f => f.type === 'ilike' && f.col === 'state_or_province')?.val?.toLowerCase();
        const rec = DB.cities.filter(c => 
          c.city.toLowerCase() === cityF?.replace(/%/g, '') && 
          c.state_or_province.toLowerCase() === stF?.replace(/%/g, '')
        );
        return { data: rec[0], error: null };
      }
      if (state.table === 'rates_snapshots') {
        return { data: DB.rates_snapshots[0], error: null };
      }
      return { data: null, error: null };
    },
    order: () => api,
    range: () => api,

    // Promise-like interface
    then: async (resolve) => {
      // Apply filters based on query state
      let results = DB[state.table] || [];

      // Handle filters
      state.filters.forEach(filter => {
        switch (filter.type) {
          case 'ilike':
            results = results.filter(r => {
              const value = r[filter.col]?.toString().toLowerCase();
              const pattern = filter.val?.toLowerCase().replace(/%/g, '');
              return value?.includes(pattern);
            });
            break;
          case 'eq':
            results = results.filter(r => {
              const value = r[filter.col]?.toString().toLowerCase();
              const pattern = filter.val?.toString().toLowerCase();
              return value === pattern;
            });
            break;
          case 'not':
            if (filter.col === 'is') {
              results = results.filter(r => r[filter.val] !== null);
            }
            break;
          case 'neq':
            results = results.filter(r => {
              const value = r[filter.col]?.toString();
              const pattern = filter.val?.toString();
              return value !== pattern;
            });
            break;
          // Add other filter types as needed
        }
      });

      // Handle specific table responses
      if (state.table === 'rates_flat') {
        return resolve({ data: results || DB.rates_flat, error: null });
      }
      if (state.table === 'rates_snapshots') {
        return resolve({ data: results || DB.rates_snapshots, error: null });
      }
      if (state.table === 'operation_logs') {
        return resolve({ data: [], error: null });
      }

      return resolve({ data: results, error: null });
    },
    catch: (reject) => Promise.reject(reject),
  };
  
  return api;
}

// Reset DB on module load
resetDatDB();

// Create mock Supabase client
export const datMockSupabase = {
  from: vi.fn(chain)
};
