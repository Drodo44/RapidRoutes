// lib/supabaseAdminClient.js
// Re-export the admin Supabase client using a lib/ path so it can be imported via
// alias '@/lib/supabaseAdminClient' (jsconfig.json maps @/* to project root).
// This preserves the single source of truth in utils/supabaseAdminClient.js.
export { adminSupabase } from '../utils/supabaseAdminClient';
