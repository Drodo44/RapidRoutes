// utils/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** Browser client (anon) */
export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Default export for legacy imports (e.g., pages/admin.js) */
export default supabase;

/** Server/admin client for API routes (service role if present) */
export const adminSupabase =
  typeof window === "undefined"
    ? createClient(url, service || anon, { auth: { persistSession: false } })
    : null;
