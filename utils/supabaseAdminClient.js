// utils/supabaseAdminClient.js
// Wrapper to provide a default export for adminSupabase (originally a named export)
import { adminSupabase } from './supabaseClient.js';

// Provide both default and named export so modules can import either:
// import adminSupabase from './supabaseAdminClient';
// or
// import { adminSupabase } from './supabaseAdminClient';
export { adminSupabase };
export default adminSupabase;
