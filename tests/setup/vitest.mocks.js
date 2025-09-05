// tests/setup/vitest.mocks.js
import { vi } from 'vitest';
import { mockSupabase } from './mock-supabase.js';
import { generateGeographicCrawlPairs } from './mock-geographic.js';

// Mock Supabase client
vi.mock('../../utils/supabaseClient.js', () => ({
    adminSupabase: mockSupabase,
    supabase: mockSupabase,
    supabaseUrl: 'https://gwuhjxomavulwduhvgvi.supabase.co',
    supabaseKey: 'test-key'
}));

// Mock geographic crawl
vi.mock('../../lib/geographicCrawl.js', () => ({
    generateGeographicCrawlPairs
}));
