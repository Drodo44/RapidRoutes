/*****************************************************
 ✅ FINAL FIX — Supabase Admin Client for Server Side
 Ensures service role key is loaded at runtime
*****************************************************/

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY; // fallback if needed

if (!supabaseUrl || !serviceKey) {
  console.error("[AdminClient] ❌ Missing Supabase credentials.");
  console.error("[AdminClient] supabaseUrl:", supabaseUrl ? "SET" : "MISSING");
  console.error("[AdminClient] serviceKey:", serviceKey ? "SET" : "MISSING");
  throw new Error("Supabase admin client cannot be initialized without credentials");
}

console.log("[AdminClient] ✅ Initializing with credentials");

const client = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log("[AdminClient] Client created, type:", typeof client);
console.log("[AdminClient] Has .from:", typeof client.from);

export const supabaseAdminClient = client;

// Legacy export for backwards compatibility
export const adminSupabase = supabaseAdminClient;

export default supabaseAdminClient;
