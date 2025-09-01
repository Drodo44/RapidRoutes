import { vi } from 'vitest';
import { datMockSupabase } from './mock-datcrawl-db.js';

// Set up mocks for all tests
vi.mock('../../utils/supabaseClient.js', () => ({
    adminSupabase: datMockSupabase
}));
