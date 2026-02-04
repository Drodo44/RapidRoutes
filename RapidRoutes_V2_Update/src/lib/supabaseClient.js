// File: src/lib/supabaseClient.js
// RapidRoutes 2.0 - Supabase Browser Client
// Provides the main Supabase client for browser-side operations

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create singleton browser client
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get the browser Supabase client.
 * Alias for compatibility with existing code.
 */
export function getBrowserSupabase() {
    return supabase;
}

export default supabase;
