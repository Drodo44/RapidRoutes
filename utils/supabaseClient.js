// utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Environment variables - Handle gracefully with logging
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Environment validation with detailed logging
function validateEnvironment() {
  const issues = [];

  // Check URL
  if (!SUPABASE_URL) {
    issues.push('NEXT_PUBLIC_SUPABASE_URL is missing');
  } else {
    try { 
      new URL(SUPABASE_URL); 
    } catch (e) {
      issues.push('NEXT_PUBLIC_SUPABASE_URL is not a valid URL');
    }
  }

  // Check keys
  if (!ANON_KEY) {
    issues.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is missing');
  }

  if (typeof window === 'undefined' && !SERVICE_ROLE) {
    issues.push('SUPABASE_SERVICE_ROLE_KEY is missing (required server-side)');
  }

  if (issues.length > 0) {
    console.error('⚠️ Supabase client initialization issues:');
    issues.forEach(issue => console.error(`- ${issue}`));
    
    // In production, try to continue with available credentials
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ Running in production - attempting to continue despite issues');
      return false;
    }
    
    throw new Error(`Supabase initialization failed: ${issues.join(', ')}`);
  }
  
  return true;
}

// Validate environment
validateEnvironment();

// Client-side Supabase
export const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
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
