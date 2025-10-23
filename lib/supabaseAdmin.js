/**
 * Supabase Admin Client - SERVER-SIDE ONLY
 * 
 * This file should ONLY be imported by:
 * - API routes (pages/api/**)
 * - Server-side utilities
 * 
 * NEVER import this in:
 * - Components (components/**)
 * - Hooks (hooks/**)
 * - Pages (pages/** except /api)
 * 
 * The service role key bypasses Row Level Security and should only be used on the server.
 */

import { createClient } from '@supabase/supabase-js';

// Explicitly guard against browser usage to avoid accidental client bundling
if (typeof window !== 'undefined') {
  throw new Error('supabaseAdmin cannot be used in browser code. Use supabaseClient instead.');
}

const supabaseAdmin =
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { 
          auth: { 
            persistSession: false,
            autoRefreshToken: false
          } 
        }
      )
    : null;

// Warn if admin client couldn't be initialized
if (!supabaseAdmin) {
  console.warn(
    '[Supabase Admin] Admin client not initialized. ' +
    'Ensure SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL are set.'
  );
}

export default supabaseAdmin;
