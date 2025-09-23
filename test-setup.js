// test-setup.js

import { vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Set up test environment
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';

// Mock Supabase client
const mockSupabase = {
  from: () => ({
    select: () => Promise.resolve({ 
      data: [
        { city: 'Mount Holly', state: 'NJ', kma_code: 'PHL', latitude: 40.0, longitude: -74.7 },
        { city: 'Harrison', state: 'OH', kma_code: 'CIN', latitude: 39.2, longitude: -84.8 }
      ], 
      error: null 
    }),
    update: () => Promise.resolve({ data: null, error: null }),
    upsert: () => Promise.resolve({ data: null, error: null })
  })
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => ({ data: null, error: null })
        })
      }),
      insert: () => ({
        select: () => ({
          single: () => ({ data: { id: 'mock-id' }, error: null })
        })
      })
    }),
    auth: {
      signIn: vi.fn(),
      signOut: vi.fn()
    },
    supabaseUrl: 'http://localhost:54321',
    supabaseKey: 'test-anon-key'
  })
}));

export { mockSupabase };