// Mock Supabase for DAT crawl tests
import { vi } from 'vitest';
import { TEST_CITIES, EQUIPMENT_TYPES, TEST_LANES } from '../mock-test-data.js';

// Initialize test database
const testDB = {
  cities: [...TEST_CITIES],
  equipment_codes: Object.values(EQUIPMENT_TYPES),
  lanes: [...TEST_LANES]
};

// Query builder state
const state = {
  table: null,
  filters: [],
  orderBy: [],
  limitVal: null
};

// Query builder methods
const api = {
  from(table) {
    state.table = table;
    return api;
  },
  select() {
    return api;
  },
  insert(data) {
    if (state.table === 'cities') {
      testDB.cities.push(...(Array.isArray(data) ? data : [data]));
    }
    return api;
  },
  update(data) {
    if (state.table === 'cities') {
      // Apply updates based on filters
      testDB.cities = testDB.cities.map(city => {
        if (state.filters.every(f => city[f.col] === f.val)) {
          return { ...city, ...data };
        }
        return city;
      });
    }
    return api;
  },
  delete() {
    if (state.table === 'cities') {
      // Remove records matching filters
      testDB.cities = testDB.cities.filter(city => 
        !state.filters.every(f => city[f.col] === f.val)
      );
    }
    return api;
  },
  eq(col, val) {
    state.filters.push({ type: 'eq', col, val });
    return api;
  },
  ilike(col, val) {
    state.filters.push({ type: 'ilike', col, val });
    return api;
  },
  in(col, vals) {
    state.filters.push({ type: 'in', col, vals });
    return api;
  },
  limit(n) {
    state.limitVal = n;
    return api;
  },
  async then() {
    // Apply filters and return data
    let data = testDB[state.table] || [];
    
    // Apply filters
    data = data.filter(record => 
      state.filters.every(f => {
        if (f.type === 'eq') {
          return record[f.col] === f.val;
        }
        if (f.type === 'ilike') {
          const val = String(f.val).toLowerCase().replace(/%/g, '');
          return String(record[f.col]).toLowerCase().includes(val);
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
  }
};

// Mock the Supabase client
export const datMockSupabase = {
  from(table) {
    state.table = table;
    state.filters = [];
    state.orderBy = [];
    state.limitVal = null;
    return api;
  }
};

// Reset database and state between tests
export const resetDatDB = () => {
  testDB.cities = [...TEST_CITIES];
  testDB.equipment_codes = Object.values(EQUIPMENT_TYPES);
  testDB.lanes = [...TEST_LANES];
  
  state.table = null;
  state.filters = [];
  state.orderBy = [];
  state.limitVal = null;
};
