// mock-supabase.js
import { createClient } from '@supabase/supabase-js';

export function createMockSupabase() {
  return createClient('http://localhost:54321', 'test-key', {
    auth: { persistSession: false },
    db: {
      schema: 'public'
    }
  });
}