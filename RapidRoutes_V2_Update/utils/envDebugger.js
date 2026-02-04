// utils/envDebugger.js
// Debug utility for environment variables and configuration

/**
 * Returns comprehensive environment information for debugging
 * Only use in non-production environments or with authorized debug tokens
 */
export function getEnvironmentDebugInfo() {
  return {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      ALLOW_TEST_MODE: process.env.ALLOW_TEST_MODE,
      ENABLE_MOCK_AUTH: process.env.ENABLE_MOCK_AUTH,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_REGION: process.env.VERCEL_REGION,
      NODE_VERSION: process.version,
      IS_DEVELOPMENT: process.env.NODE_ENV !== 'production',
      IS_PRODUCTION: process.env.NODE_ENV === 'production'
    },
    runtime: {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      arch: process.arch
    }
  };
}

/**
 * Calculates the effective test mode configuration
 * @param {object} req - Express/Next.js request object
 * @param {object} options - Options including payload fields
 * @returns {object} Complete test mode configuration
 */
export function calculateTestModeConfig(req, { fields = {} } = {}) {
  const isDev = process.env.NODE_ENV !== 'production';
  const testModeEnabled = isDev || process.env.ALLOW_TEST_MODE === 'true';
  const isTestRequest = fields.test_mode === true;
  const useTestMode = testModeEnabled && isTestRequest;
  
  const mockEnabled = isDev || process.env.ENABLE_MOCK_AUTH === 'true';
  const mockParam = req.query?.mock_auth || fields.mock_auth;
  const useMockAuth = (mockEnabled && mockParam) || useTestMode || (isDev && fields.test_mode);

  return {
    isDev,
    testModeEnabled,
    isTestRequest,
    useTestMode,
    mockEnabled,
    mockParam,
    useMockAuth,
    rawValues: {
      test_mode: fields.test_mode,
      mock_auth: fields.mock_auth
    },
    env_vars: {
      NODE_ENV: process.env.NODE_ENV,
      ALLOW_TEST_MODE: process.env.ALLOW_TEST_MODE,
      ENABLE_MOCK_AUTH: process.env.ENABLE_MOCK_AUTH
    }
  };
}

/**
 * Determines if a request is authorized for debug information
 * @param {object} req - Express/Next.js request object
 * @returns {boolean} Whether debug information can be shared
 */
export function canProvideDebugInfo(req) {
  // Never provide debug info in production unless specifically authorized
  if (process.env.NODE_ENV === 'production') {
    // Check for debug authorization token - only provide debug info if token matches
    const debugToken = req.headers['x-debug-token'];
    return debugToken === process.env.DEBUG_AUTH_TOKEN;
  }
  
  // In development, always provide debug info
  return true;
}

/**
 * Creates a debug endpoint response if debug headers are present
 * @param {object} req - Express/Next.js request object  
 * @param {object} res - Express/Next.js response object
 * @param {object} options - Additional debug context
 * @returns {boolean} True if debug response was sent, false otherwise
 */
export function handleDebugRequest(req, res, options = {}) {
  const isDebugRequest = 
    req.headers['x-debug-env'] === 'true' || 
    req.query?.debug_env === 'true' ||
    (options.fields && options.fields.debug_env === true);
    
  if (isDebugRequest) {
    if (!canProvideDebugInfo(req)) {
      return res.status(403).json({
        error: 'Debug information not available in production',
        success: false
      });
    }
    
    const testConfig = options.fields 
      ? calculateTestModeConfig(req, { fields: options.fields })
      : null;
      
    return res.status(200).json({
      debug: true,
      ...getEnvironmentDebugInfo(),
      testConfig,
      ...options.additionalInfo
    });
  }
  
  return false;
}

export default {
  getEnvironmentDebugInfo,
  calculateTestModeConfig,
  canProvideDebugInfo,
  handleDebugRequest
};