// Modified endpoint for manual testing of the authentication flow
// This will return the Supabase URL, token claims, and authentication details for debugging

import { supabase } from '../../utils/supabaseClient.js';

export default async function handler(req, res) {
  // Check if a token is in the request
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1] || null;
  
  // Environment variables check (boolean only - no sensitive data)
  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    SUPABASE_SERVICE_KEY: Boolean(process.env.SUPABASE_SERVICE_KEY),
    HERE_API_KEY: Boolean(process.env.HERE_API_KEY)
  };

  // Response object
  const response = {
    env: envStatus,
    auth: {
      headerPresent: Boolean(authHeader),
      tokenPresent: Boolean(token),
      tokenPrefix: authHeader.split(' ')[0] || null
    },
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    timestamp: new Date().toISOString()
  };

  // Return the response
  res.status(200).json(response);
}