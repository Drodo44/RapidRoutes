// test-utils/setupTests.js
import { vi } from 'vitest';
import { mockSupabaseClient, mockSupabaseUrl, mockSupabaseKey } from './mockSupabase';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => mockSupabaseClient
}));

// Mock supabaseClient.js
vi.mock('../utils/supabaseClient', () => ({
    supabase: mockSupabaseClient,
    supabaseUrl: mockSupabaseUrl,
    supabaseKey: mockSupabaseKey
}));
