// utils/supabaseAdminClient.js
import { createClient } from "@supabase/supabase-js";

// Hard guard: never allow service-role in browser bundles
if (typeof window !== "undefined") {
  throw new Error("[supabaseAdminClient] Do not import this on the client.");
}

// Use server envs; fall back to NEXT_PUBLIC_SUPABASE_URL if SUPABASE_URL not set
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "[supabaseAdminClient] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { headers: { "X-Client-Info": "RapidRoutes-admin" } },
});

export default adminSupabase;
