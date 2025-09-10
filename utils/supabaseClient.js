// utils/supabaseClient.js
// Production-safe Supabase clients for browser (anon) and server (service role).
// - NEVER import `adminSupabase` in client-side code.
// - This module conditionally creates the admin client only on the server.
// - RLS: keep policies as in your SQL; admin client is only for server routes.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Small, resilient thenable/mock for development when Supabase envs are missing.
function makeThenable(data = []) {
  const obj = {
    then: (resolve) => resolve({ data, error: null }),
    catch: () => obj,
  };
  // chainable query helpers
  const chain = ['select','insert','update','delete','eq','gte','lte','not','limit','order','ilike','neq','single','maybeSingle','rpc','from'];
  for (const k of chain) {
    obj[k] = () => obj;
  }
  return obj;
}

function makeMockClient() {
  return {
    from: () => makeThenable([]),
    rpc: () => makeThenable([]),
    auth: { getUser: async () => ({ data: null, error: null }) },
  };
}

let supabase;
let adminSupabase = null;

if (SUPABASE_URL && SUPABASE_ANON) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else {
  console.warn('⚠️ NEXT dev: NEXT_PUBLIC_SUPABASE_URL or ANON key missing — using mock supabase client for dev');
  supabase = makeMockClient();
}

const isServer = typeof window === 'undefined';
if (isServer) {
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (SERVICE_ROLE && SUPABASE_URL) {
    adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { 'X-Client-Info': 'RapidRoutes-Server' } },
    });
  } else {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY missing — adminSupabase will be a mock in server environment');
    adminSupabase = makeMockClient();
  }
}

export { supabase, adminSupabase };
export default supabase;
