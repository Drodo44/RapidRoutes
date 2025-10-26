import { createClient } from '@supabase/supabase-js';

// Server-only guard to prevent accidental bundling/usage in the browser
if ((globalThis)?.window !== undefined) {
  throw new TypeError('supabaseAdmin must not be imported in the browser');
}

function resolveSupabaseUrl() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    console.error('[Supabase Admin] Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL');
    throw new Error('Supabase URL not configured for admin client');
  }
  if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('[Supabase Admin] Using NEXT_PUBLIC_SUPABASE_URL as fallback; consider setting SUPABASE_URL');
  }
  return url;
}

function resolveServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE
    || process.env.SERVICE_ROLE_KEY
    || '';
  if (!key) {
    console.error('[Supabase Admin] Missing SUPABASE_SERVICE_ROLE_KEY in environment');
    throw new Error('Service role key not configured');
  }
  return key;
}

const url = resolveSupabaseUrl();
const serviceKey = resolveServiceRoleKey();

const admin = createClient(url, serviceKey, {
  auth: {
    // Never persist sessions on the server for the admin client
    persistSession: false,
    autoRefreshToken: false,
  },
  global: { headers: { 'x-rapidroutes-client': 'server-admin' } },
});

// Export default for the common `import supabaseAdmin from '@/lib/supabaseAdmin'` usage
// and also a named export for files expecting `adminSupabase`.
export const adminSupabase = admin;
export default admin;
 
