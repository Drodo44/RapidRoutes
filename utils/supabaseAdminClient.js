/**
 * LEGACY EXPORT - DO NOT USE IN NEW CODE
 * This file re-exports from lib/supabaseAdmin.ts for backward compatibility
 * 
 * NEW CODE SHOULD IMPORT DIRECTLY FROM:
 * import supabaseAdmin from '@/lib/supabaseAdmin';
 * 
 * This file exists only for legacy imports and will be removed in future versions
 */

import supabaseAdmin from '../lib/supabaseAdmin.ts';

// Re-export for backward compatibility
export const adminSupabase = supabaseAdmin;
export { supabaseAdmin };
export default supabaseAdmin;
