// pages/api/debug/env-check.js
// Debug endpoint for environment variable checking
// NOTE: This should be disabled or secured in production!

export default function handler(req, res) {
  // Security check - require a special header or query param
  const isAuthorized = 
    req.headers['x-debug-token'] === 'SPECIAL_DEBUG_TOKEN' ||
    req.query.debug_token === 'SPECIAL_DEBUG_TOKEN';
  
  if (!isAuthorized) {
    return res.status(403).json({
      error: 'Unauthorized debug request',
      message: 'Debug token required'
    });
  }
  
  // Return limited environment information
  return res.status(200).json({
    environmentInfo: {
      NODE_ENV: process.env.NODE_ENV,
      ALLOW_TEST_MODE: process.env.ALLOW_TEST_MODE,
      ENABLE_MOCK_AUTH: process.env.ENABLE_MOCK_AUTH,
    },
    computedValues: {
      isDev: process.env.NODE_ENV !== 'production',
      testModeEnabled: process.env.NODE_ENV !== 'production' || process.env.ALLOW_TEST_MODE === 'true',
      mockAuthEnabled: process.env.NODE_ENV !== 'production' || process.env.ENABLE_MOCK_AUTH === 'true',
    },
    serverInfo: {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version
    }
  });
}