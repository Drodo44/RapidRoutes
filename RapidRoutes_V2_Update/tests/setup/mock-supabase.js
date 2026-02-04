import { vi } from 'vitest';
import { MOCK_CITIES as TEST_CITIES, MOCK_LANES as TEST_LANES } from '../mock-data.js';

const EQUIPMENT_TYPES = {
  V: 'Van',
  FD: 'Flatbed',
  R: 'Reefer'
};

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
  // Create query state for this builder instance
  const builderState = {
    table: null,
    filters: [],
    orderBy: [],
    limitVal: null,
    selectedColumns: '*'
  };
  const initialState = {
    table: null,
    filters: [],
    orderBy: [],
    limitVal: null
  };

  let state = { ...initialState };

  const builder = {
    select: vi.fn((columns = '*') => {
      builderState.selectedColumns = columns;
      return builder;
    }),
    insert: vi.fn((data) => {
      if (Array.isArray(data)) {
        if (!testDB[builderState.table]) testDB[builderState.table] = [];
        testDB[builderState.table].push(...data);
      } else {
        if (!testDB[builderState.table]) testDB[builderState.table] = [];
        testDB[builderState.table].push(data);
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
      builderState.filters.push({ type: 'eq', col, val });
      return builder;
    }),
    ilike: vi.fn((col, val) => {
      builderState.filters.push({ type: 'ilike', col, val });
      return builder;
    }),
    in: vi.fn((col, vals) => {
      builderState.filters.push({ type: 'in', col, vals });
      return builder;
    }),
    limit: vi.fn((n) => {
      builderState.limitVal = n;
      return builder;
    }),
    then: vi.fn(async () => {
      // Apply filters to data
      let data = testDB[builderState.table] || [];
      
      // Apply filters
      data = data.filter(record => 
        builderState.filters.every(f => {
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
      if (builderState.limitVal) {
        data = data.slice(0, builderState.limitVal);
      }
      
      return { data, error: null };
    })
  };
  
  // Reset state before returning for next query
  builder.then(async () => {
    Object.assign(builderState, {
      table: null,
      filters: [],
      orderBy: [],
      limitVal: null
    });
  });
  
  return builder;
};

// Mock the Supabase client
const mockSupabaseClient = {
  from: vi.fn((table) => {
    return createQueryBuilder().select('*');
  })
};

export const mockSupabase = {
  from: (table) => {
    const builder = createQueryBuilder();
    builder.select('*');
    builder.then(() => {
      builder.table = table;
    });
    return builder;
  }
};
