// pages/api/debug/environment.js
// Debug endpoint for environment configuration
// NOTE: This endpoint should be disabled in production!

import { extractAuthToken } from '../../../utils/apiAuthUtils.js';
import { getEnvironmentDebugInfo, calculateTestModeConfig, canProvideDebugInfo } from '../../../utils/envDebugger.js';

export default async function handler(req, res) {
  try {
    // Critical security check: ensure this endpoint is not accessible in production
    // unless an authorized debug token is provided
    if (!canProvideDebugInfo(req)) {
      return res.status(403).json({
        error: 'Debug endpoints are disabled in production',
        message: 'For security reasons, debug information is not available in production environments'
      });
    }

    // Extract auth info for debugging
    const { token: accessToken, source, error: extractionError } = extractAuthToken(req);
    
    // Get test mode configuration info
    const normalizedFields = {
      test_mode: req.body?.test_mode === true || req.query?.test_mode === 'true',
      mock_auth: req.body?.mock_auth === true || req.query?.mock_auth === 'true',
      debug_env: req.body?.debug_env === true || req.query?.debug_env === 'true',
    };

    const testConfig = calculateTestModeConfig(req, { fields: normalizedFields });

    // Return comprehensive environment debug info
    return res.status(200).json({
      debug: true,
      timestamp: new Date().toISOString(),
      environment: getEnvironmentDebugInfo(),
      authentication: {
        hasToken: !!accessToken,
        tokenSource: source,
        extractionError: extractionError || null,
      },
      testModeConfig: testConfig,
      request: {
        method: req.method,
        url: req.url,
        headers: {
          // Only include safe headers for debugging
          'content-type': req.headers['content-type'],
          'user-agent': req.headers['user-agent'],
          'x-debug-env': req.headers['x-debug-env'],
          'x-debug-token': '***REDACTED***',
          // Do not include Authorization header for security
        },
        query: req.query,
        body: req.body,
        normalizedFields
      }
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
}