// utils/supabaseAdminClient.js
// Standalone admin (service-role) Supabase client.
// This bypasses the shared client wrapper to guarantee a direct service key client
// for server-side usage only. NEVER import this in client/browser bundles.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "[supabaseAdminClient] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

// ✅ Create the admin client (no session persistence, explicit server usage)
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: {
    headers: { 'X-Client-Info': 'RapidRoutes-Admin' }
  }
});

// ✅ Export both default + named for flexible import styles
export default adminSupabase;
export { adminSupabase };
