// tests/setup/mock-supabase-datcrawl.js
import { vi } from 'vitest';

// Create a realistic mock for Supabase queries
let state;

export function resetState() {
  state = { filters: [] };
}

resetState();

const mockSupabaseQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  ilike: vi.fn((col, val) => { state.filters.push({ type: 'ilike', col, val }); return mockSupabaseQueryBuilder; }),
  in: vi.fn().mockReturnThis(),
  filter: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  execute: vi.fn(function() {
    console.log('Mock Supabase filters:', state.filters);
    const cityF = state.filters.find(f => f.type === 'ilike' && f.col === 'city')?.val?.toLowerCase();
    const stF = state.filters.find(f => f.type === 'ilike' && f.col === 'state_or_province')?.val?.toLowerCase();
    console.log('Looking for city:', cityF, 'state:', stF);
    console.log('Available cities:', DB.cities);
    let results = DB.cities;
    if (cityF) {
      results = results.filter(c => c.city.toLowerCase() === cityF.replace(/%/g, '').toLowerCase());
      console.log('After city filter:', results);
    }
    if (stF) {
      results = results.filter(c => c.state_or_province.toLowerCase() === stF.replace(/%/g, '').toLowerCase());
      console.log('After state filter:', results);
    }
    return Promise.resolve({ data: results, error: null });
  }),
  then: vi.fn(callback => callback({ data: [], error: null }))
};

export const mockSupabase = {
  from: vi.fn(() => mockSupabaseQueryBuilder)
};

// Export the mock to be used in tests
vi.mock('../../utils/supabaseClient.js', () => ({
  adminSupabase: mockSupabase
}));
