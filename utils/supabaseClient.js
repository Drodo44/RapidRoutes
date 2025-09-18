// utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Environment variables
let SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
if (typeof SUPABASE_URL === 'string' && SUPABASE_URL.includes('${')) {
  SUPABASE_URL = 'http://localhost:54321';
}
try { new URL(SUPABASE_URL); } catch { SUPABASE_URL = 'http://localhost:54321'; }

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon-key-placeholder';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client-side Supabase
export const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
  },
});

// Server-side admin client
let adminSupabase;
if (typeof window === 'undefined') {
  if (SERVICE_ROLE && SERVICE_ROLE !== 'your_service_role_key_here') {
    adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { 'X-Client-Info': 'RapidRoutes-Server' },
      },
    });
  } else {
    adminSupabase = process.env.NODE_ENV === 'test'
      ? {
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
        }
      : createClient(SUPABASE_URL, SERVICE_ROLE || 'test-mock-key', {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: { 'X-Client-Info': 'RapidRoutes-Server' },
          },
        });
  }
}

export { adminSupabase };
export default supabase;
