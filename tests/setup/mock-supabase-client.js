// tests/setup/mock-supabase-client.js
import { vi } from 'vitest';
import { mockSupabase } from './mock-supabase.js';

vi.mock('../../utils/supabaseClient.js', () => ({
  supabase: mockSupabase,
  adminSupabase: mockSupabase,
  supabaseUrl: 'https://gwuhjxomavulwduhvgvi.supabase.co',
  supabaseKey: 'test-key'
}));
