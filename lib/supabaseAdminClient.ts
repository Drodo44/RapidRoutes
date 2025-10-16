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

// Force immediate logging
(() => {
  console.log("[AdminClient] ✅ Initializing with credentials");
  console.log("[AdminClient] URL:", supabaseUrl);
  console.log("[AdminClient] Service key prefix:", serviceKey.slice(0, 20) + "...");
  console.log("[AdminClient] Service key length:", serviceKey.length);
  console.log("[AdminClient] Is anon key?:", serviceKey.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI"));
})();

export const supabaseAdminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'Authorization': `Bearer ${serviceKey}`,
    },
  },
});

console.log("[AdminClient] ✅ Client created successfully");
console.log("[AdminClient] Type:", typeof supabaseAdminClient);
console.log("[AdminClient] Has .from:", typeof supabaseAdminClient.from);

export default supabaseAdminClient;
