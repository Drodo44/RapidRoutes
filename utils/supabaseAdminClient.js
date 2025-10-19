/**
 * This file exports the server-side Supabase client with service-role access.
 * It uses the shared singleton pattern from lib/supabaseClient.js.
 */

import { getServerSupabase } from '../lib/supabaseClient.js';

// Only works server-side (API routes)
if (typeof window !== 'undefined') {
  console.error('❌ [Admin Supabase] Cannot use admin client on the browser');
}

// Fallback logic for service role key (consistent with URL/ANON_KEY pattern)
function resolveServiceRoleKey() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    console.warn('⚠️ [Admin Supabase] SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  }
  
  if (serviceRoleKey && serviceRoleKey.startsWith('eyJ')) {
    console.log('✅ [Admin Supabase] Service role key configured successfully');
  }
  
  return serviceRoleKey;
}

// Validate service role key is available
resolveServiceRoleKey();

export const adminSupabase = getServerSupabase();
