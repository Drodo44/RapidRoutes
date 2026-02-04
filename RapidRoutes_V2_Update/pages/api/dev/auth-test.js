// pages/api/dev/auth-test.js
/**
 * DEVELOPMENT ONLY: Authentication test endpoint
 * This endpoint is for testing authentication flow in isolation
 * It is only enabled in development mode
 */

import { extractAuthToken, getTokenInfo } from '../../../utils/apiAuthUtils';

export default async function handler(req, res) {
  // Only available in development mode
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      error: 'Not found',
      details: 'This endpoint is only available in development mode',
      success: false
    });
  }

  try {
    // Extract the token from the request
    const { token, source, error: extractionError, ...tokenMetadata } = extractAuthToken(req);
    
    // Get token info if available
    const tokenInfo = token ? getTokenInfo(token) : null;
    
    // If we have a token, validate it with Supabase
    let validationResult = null;
    if (token) {
      try {
        const { adminSupabase } = await import('../../../utils/supabaseClient.js');
        const { data, error } = await adminSupabase.auth.getUser(token);
        
        validationResult = {
          valid: !error && !!data?.user,
          user: data?.user ? {
            id: data.user.id,
            email: data.user.email,
            emailConfirmed: data.user.email_confirmed_at ? true : false,
            lastSignIn: data.user.last_sign_in_at,
            createdAt: data.user.created_at
          } : null,
          error: error ? {
            message: error.message,
            status: error.status,
            name: error.name
          } : null
        };
      } catch (validationError) {
        validationResult = {
          valid: false,
          error: {
            message: validationError.message,
            name: validationError.name
          }
        };
      }
    }
    
    // Build the response with detailed authentication information
    const response = {
      success: true,
      auth: {
        hasToken: !!token,
        source,
        tokenStart: token ? `${token.substring(0, 10)}...` : null,
        extractionError: extractionError || null,
        tokenMetadata,
        decodedToken: tokenInfo,
        validationResult,
        requestInfo: {
          method: req.method,
          path: req.url,
          headers: Object.keys(req.headers || {}),
          hasAuthHeader: 'authorization' in req.headers,
          cookieCount: Object.keys(req.cookies || {}).length,
          cookieNames: Object.keys(req.cookies || {})
        }
      }
    };
    
    // Return the authentication test results
    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      error: 'Server error',
      details: error.message,
      success: false
    });
  }
}