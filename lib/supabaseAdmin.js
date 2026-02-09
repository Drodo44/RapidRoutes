import { createClient } from '@supabase/supabase-js';

// Server-only guard to prevent accidental bundling/usage in the browser
// MODIFIED: Return null stub instead of throwing to allow bundling without crashing
let admin = null;

if (typeof window !== 'undefined') {
  console.warn('⚠️ supabaseAdmin imported in browser context - functionality disabled');
  // We return a proxy that logs errors on access to catch actual usage
  admin = new Proxy({}, {
    get: function (target, prop) {
      console.error(`❌ Attempted to access supabaseAdmin.${String(prop)} in browser! This is a server-only module.`);
      return () => Promise.reject(new Error(`supabaseAdmin.${String(prop)} is not available in browser`));
    }
  });
} else {
  // Server-side initialization
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SERVICE_ROLE_KEY;

    if (!url || !key) {
      console.error('[Supabase Admin] Missing URL or Service Role Key');
      // process.exit(1); // Don't crash process, just log
    } else {
      admin = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: { headers: { 'x-rapidroutes-client': 'server-admin' } },
      });
    }
  } catch (err) {
    console.error('[Supabase Admin] Initialization error:', err);
  }
}

// Export default for the common `import supabaseAdmin from '@/lib/supabaseAdmin'` usage
// and also a named export for files expecting `adminSupabase`.
export const adminSupabase = admin;
export default admin;

