// utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Warn (don't throw) on client for missing public envs
if (!url || !anon) {
  console.warn(
    '[supabaseClient] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
  global: { headers: { 'X-Client-Info': 'RapidRoutes-web' } },
});

export default supabase;
