// tests/setup/mock-supabase-client.js
import { vi } from 'vitest';
import { mockSupabase } from './mock-supabase.js';

vi.mock('../../utils/supabaseClient.js', () => ({
  supabase: mockSupabase,
  adminSupabase: mockSupabase,
  supabaseUrl: 'https://gwuhjxomavulwduhvgvi.supabase.co',
  supabaseKey: 'test-key'
}));

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
    }
  })
}));
