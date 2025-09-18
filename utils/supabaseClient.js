// utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Environment variables
// Get mandatory environment variables or throw immediately
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!SUPABASE_URL || SUPABASE_URL.includes('${')) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required');
}

// Validate URL format
try { new URL(SUPABASE_URL); } catch (e) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL must be a valid URL');
}

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!ANON_KEY || ANON_KEY === 'anon-key-placeholder') {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
}

const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (typeof window === 'undefined' && (!SERVICE_ROLE || SERVICE_ROLE === 'your_service_role_key_here')) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for server-side operations');
}

// Client-side Supabase
export const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: typeof window !== 'undefined',
    autoRefreshToken: typeof window !== 'undefined',
  },
});

// Server-side admin client with strict initialization
const adminSupabase = typeof window === 'undefined' 
  ? createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { 'X-Client-Info': 'RapidRoutes-Server' },
      },
      // Enhanced debug logging for initialization issues
      db: {
        schema: 'public',
        logger: (level, message) => {
          if (level === 'error' || level === 'warn') {
            console.error(`[Supabase ${level}]`, message);
          }
        },
      },
    })
  : null; // Explicitly null on client-side to prevent misuse

export { adminSupabase };
export default supabase;
