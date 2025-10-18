// utils/supabaseAdminClient.js
// Re-export from the main singleton module
import { getServerSupabase } from '../lib/supabaseClient.js';

// Hard guard: never allow service-role in browser bundles
if (typeof window !== "undefined") {
  throw new Error("[supabaseAdminClient] Do not import this on the client.");
}

// Use the singleton server client
export const adminSupabase = getServerSupabase();

export default adminSupabase;
