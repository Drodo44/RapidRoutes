/**
 * Supabase Admin Client - SERVER ONLY
 * This file must NEVER be imported in browser code
 * Only use in API routes and server-side utilities
 */

import { createClient } from '@supabase/supabase-js';

// Guard against browser usage
if ((globalThis as any)?.window !== undefined) {
  throw new TypeError('supabaseAdmin cannot be used in browser code. Use supabaseClient instead.');
}

// Validate required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // Non-fatal warning to aid runtime diagnostics in production logs before throwing
  console.warn('⚠️ Supabase env vars missing at runtime. Check Vercel project settings.');
}

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

// Create admin client with service role key (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabaseAdmin;
