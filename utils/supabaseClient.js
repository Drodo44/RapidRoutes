// utils/supabaseClient.js
// Re-export from the main singleton module
import { getBrowserSupabase, getServerSupabase } from '../lib/supabaseClient.js';

// Browser client (for client-side code)
export const supabase = typeof window !== 'undefined'
  ? (() => { try { return getBrowserSupabase(); } catch { return null; } })()
  : null;

// DO NOT import adminSupabase here - this file can be bundled for the browser
// Use @/lib/supabaseAdmin directly in server-side code (API routes, lib functions)

export { getBrowserSupabase, getServerSupabase };
export default supabase;
