import { vi } from 'vitest';
import { TEST_CITIES, EQUIPMENT_TYPES, TEST_LANES } from '../mock-test-data.js';

// Initialize DB state
const testDB = {
  cities: [...TEST_CITIES],
  equipment_codes: Object.values(EQUIPMENT_TYPES),
  lanes: [...TEST_LANES]
};

// Reset DB state
export const resetTestState = () => {
  testDB.cities = [...TEST_CITIES];
  testDB.equipment_codes = Object.values(EQUIPMENT_TYPES);
  testDB.lanes = [...TEST_LANES];
};

// Query builder methods
const createQueryBuilder = () => {
  const state = {
    table: null,
    filters: [],
    orderBy: [],
    limitVal: null
  };

  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn((data) => {
      if (Array.isArray(data)) {
        testDB[state.table].push(...data);
      } else {
        testDB[state.table].push(data);
      }
      return builder;
    }),
    update: vi.fn((data) => {
      testDB[state.table] = testDB[state.table].map(record => {
        if (state.filters.every(f => record[f.col] === f.val)) {
          return { ...record, ...data };
        }
        return record;
      });
      return builder;
    }),
    delete: vi.fn(() => {
      testDB[state.table] = testDB[state.table].filter(record => 
        !state.filters.every(f => record[f.col] === f.val)
      );
      return builder;
    }),
    eq: vi.fn((col, val) => {
      state.filters.push({ type: 'eq', col, val });
      return builder;
    }),
    ilike: vi.fn((col, val) => {
      state.filters.push({ type: 'ilike', col, val });
      return builder;
    }),
    in: vi.fn((col, vals) => {
      state.filters.push({ type: 'in', col, vals });
      return builder;
    }),
    limit: vi.fn((n) => {
      state.limitVal = n;
      return builder;
    }),
    then: vi.fn(async () => {
      // Apply filters to data
      let data = testDB[state.table] || [];
      
      // Apply filters
      data = data.filter(record => 
        state.filters.every(f => {
          if (f.type === 'eq') {
            return record[f.col] === f.val;
          }
          if (f.type === 'ilike') {
            return record[f.col]?.toLowerCase().includes(f.val.toLowerCase());
          }
          if (f.type === 'in') {
            return f.vals.includes(record[f.col]);
          }
          return true;
        })
      );
      
      // Apply limit
      if (state.limitVal) {
        data = data.slice(0, state.limitVal);
      }
      
      return { data, error: null };
    })
  };
  
  return builder;
};

// Mock the Supabase client
export const mockSupabase = {
  from: vi.fn((table) => {
    const builder = createQueryBuilder();
    builder.table = table;
    return builder;
  })
};
