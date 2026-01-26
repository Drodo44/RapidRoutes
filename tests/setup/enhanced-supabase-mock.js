import { vi } from 'vitest';
import TEST_CITIES from './test-cities.js';

// Create query builder without recursion
const createQueryBuilder = () => {
  const queryResult = Promise.resolve({ data: TEST_CITIES, error: null });
  
  // Base builder with non-chainable functions
  const baseBuilder = {
    then: (callback) => queryResult.then(callback),
    catch: (callback) => queryResult.catch(callback),
    finally: (callback) => queryResult.finally(callback)
  };

  // Chainable methods that should return the builder
  const chainableMethods = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    upsert: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    in: () => builder,
    limit: () => builder,
    single: () => builder,
    maybeSingle: () => builder,
    filter: () => builder,
    order: () => builder,
    range: () => builder
  };

  // Create mock functions for all chainable methods
  Object.keys(chainableMethods).forEach(method => {
    chainableMethods[method] = vi.fn(chainableMethods[method]);
  });

  // Combine base and chainable into final builder
  const builder = {
    ...baseBuilder,
    ...chainableMethods
  };

  return builder;
};

// Create Supabase mock
const mockSupabase = {
  from: vi.fn(() => createQueryBuilder())
};

// Set up mock implementation for vitest
vi.mock('../../utils/supabaseClient.js', () => ({
  adminSupabase: mockSupabase
}));

export default mockSupabase;
