// utils/supabaseClient.js
// Production-safe Supabase clients for browser (anon) and server (service role).
// - NEVER import `adminSupabase` in client-side code.
// - This module conditionally creates the admin client only on the server.
// - RLS: keep policies as in your SQL; admin client is only for server routes.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Browser/client: anon key
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Server-only admin client (guard so the service key is not bundled to the client)
const isServer = typeof window === 'undefined' || process.env.NODE_ENV === 'test';
let adminSupabase = null;

if (isServer) {
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // In test environment, we'll use a mock if no service role key is available
  if (!SERVICE_ROLE && process.env.NODE_ENV !== 'test') {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY on server');
  }
  adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE || 'test-mock-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: { 'X-Client-Info': 'RapidRoutes-Server' },
    },
  });
}

export { adminSupabase };

// Optional default export (for any legacy code that used `import supabase from ...`)
export default supabase;
