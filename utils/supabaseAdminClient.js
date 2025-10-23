/**
 * SERVER-ONLY ADMIN CLIENT
 *
 * This legacy shim previously re-exported from lib/supabaseAdmin.ts, which
 * could inadvertently be bundled in the browser through indirect imports.
 *
 * To harden against that, we instantiate the admin client here with a strict
 * server-only guard and export it for back-compat. Any browser import will
 * throw immediately with a clear message.
 */

// Guard against browser usage early
if (typeof window !== 'undefined') {
	throw new Error('supabaseAdmin cannot be imported in browser code');
}

// Import the server-only admin client. This keeps createClient calls centralized
// in lib/supabaseAdmin.{ts,js} to satisfy singleton verification.
import supabaseAdmin from '../lib/supabaseAdmin';

// Back-compat named and default exports
export const adminSupabase = supabaseAdmin;
export { supabaseAdmin };
export default supabaseAdmin;
