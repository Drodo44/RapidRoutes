// utils/supabaseClient.js
// Re-export from the main singleton module
import { getBrowserSupabase, getServerSupabase } from '../lib/supabaseClient.js';

// Browser client (for client-side code)
export const supabase = typeof window !== 'undefined'
  ? (() => { try { return getBrowserSupabase(); } catch { return null; } })()
  : null;

// Re-export adminSupabase for backward compatibility
import { adminSupabase } from './supabaseAdminClient.js';

export { getBrowserSupabase, getServerSupabase, adminSupabase };
export default supabase;
