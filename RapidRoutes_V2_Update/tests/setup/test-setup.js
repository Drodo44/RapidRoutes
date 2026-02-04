import { vi } from 'vitest';
import { createMockDatabase } from './enhanced-mock-db.js';

// Create a fresh mock database instance for each test
const mockSupabase = createMockDatabase();

// Set up mocks for all tests
vi.mock('../../utils/supabaseClient.js', () => ({
    adminSupabase: mockSupabase
}));

// Reset mock database between tests
beforeEach(() => {
    Object.assign(mockSupabase, createMockDatabase());
});
