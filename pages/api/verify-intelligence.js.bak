// pages/api/verify-intelligence.js
// This endpoint checks if the authentication and API routing are working correctly
// without requiring a complete intelligence operation

export default async function handler(req, res) {
  // Handle OPTIONS requests (for CORS)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(204).end();
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      details: 'Only POST requests are supported',
      success: false
    });
  }

  try {
    // Extract token from authorization header
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    // Log authentication info for debugging
    const authInfo = {
      hasAuthHeader: !!authHeader,
      hasBearer: !!bearer,
      method: req.method,
      contentType: req.headers['content-type'],
      headerKeys: Object.keys(req.headers || {})
    };
    
    // If no token, return unauthorized
    if (!bearer) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Missing authentication token',
        authInfo,
        success: false
      });
    }
    
    // Import Supabase client for token verification
    const { adminSupabase } = await import('../../utils/supabaseClient.js');
    
    // Verify token
    try {
      const { data, error } = await adminSupabase.auth.getUser(bearer);
      
      if (error || !data?.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          details: error?.message || 'Invalid authentication token',
          authInfo,
          success: false
        });
      }
      
      // Token is valid, return success
      return res.status(200).json({
        success: true,
        message: 'Authentication successful',
        user: {
          id: data.user.id,
          email: data.user.email
        },
        api: 'verify-intelligence',
        timestamp: new Date().toISOString()
      });
    } catch (authError) {
      return res.status(401).json({
        error: 'Unauthorized',
        details: 'Token validation failed',
        message: authError.message,
        success: false
      });
    }
  } catch (error) {
    console.error('Verification API error:', error);
    
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
      success: false
    });
  }
}