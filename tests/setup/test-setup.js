import { vi } from 'vitest';
import { createMockDatabase } from './enhanced-mock-db.js';

// Create a fresh mock database instance for each test
const mockSupabase = createMockDatabase();

// Set up mocks for all tests
vi.mock('../../utils/supabaseClient.js', () => ({
    adminSupabase: mockSupabase
}));

// Mock the createClient function from supabase-js
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        auth: {
            signIn: vi.fn(),
            signOut: vi.fn(),
        },
        from: () => ({
            select: () => ({ data: [], error: null }),
        }),
        supabaseUrl: 'http://localhost:54321',
        supabaseKey: 'test-anon-key',
    }),
}));

// Reset mock database between tests
beforeEach(() => {
    Object.assign(mockSupabase, createMockDatabase());
});
