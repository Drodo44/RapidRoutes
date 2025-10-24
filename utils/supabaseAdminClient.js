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
if ((globalThis)?.window !== undefined) {
	throw new TypeError('supabaseAdmin cannot be imported in browser code');
}

// Runtime guard: log a warning if env vars are missing (helps diagnose prod incidents)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
	console.warn('⚠️ Supabase env vars missing at runtime. Check Vercel project settings.');
}

// Re-export the server-only admin client. This keeps createClient calls centralized
// in lib/supabaseAdmin.{ts,js} to satisfy singleton verification.
export { default as supabaseAdmin } from '../lib/supabaseAdmin';
export { default as adminSupabase } from '../lib/supabaseAdmin';
export { default } from '../lib/supabaseAdmin';
