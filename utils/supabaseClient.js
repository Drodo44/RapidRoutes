// utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Critical: Validate environment variables before creating client
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ [supabaseClient] Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✅ Set' : '❌ MISSING');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Set' : '❌ MISSING');
  console.error('   Check Vercel environment variables or .env.local file');
}

// Create client with validated credentials (use empty strings as fallback to prevent crash)
const supabase = createClient(
  SUPABASE_URL || '', 
  SUPABASE_ANON_KEY || '', 
  {
    auth: { 
      persistSession: true, 
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: { 
      headers: { 'X-Client-Info': 'RapidRoutes-web' } 
    },
  }
);

// Re-export adminSupabase for backward compatibility
import { adminSupabase } from './supabaseAdminClient.js';

export { supabase, adminSupabase };
export default supabase;
