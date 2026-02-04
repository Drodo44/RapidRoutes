// utils/supabaseClient.js
// Re-export from the main singleton module
import { getBrowserSupabase } from '../lib/supabaseClient.js';

// Browser client (for client-side code)
export const supabase = typeof window !== 'undefined'
  ? (() => { try { return getBrowserSupabase(); } catch { return null; } })()
  : null;

// DO NOT import adminSupabase here - this file can be bundled for the browser
// For server-side admin operations, use:
// import supabaseAdmin from '@/lib/supabaseAdmin';

export { getBrowserSupabase };
export default supabase;
