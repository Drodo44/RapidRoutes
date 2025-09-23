// pages/api/intelligence-pairing.js
// API endpoint for geographic crawl intelligence pairing

import { extractAuthToken } from '../../utils/apiAuthUtils.js';
import { adminSupabase } from '../../utils/supabaseClient.js';

export default async function handler(req, res) {
  // Track request handling time for performance monitoring
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

  try {
    // Enhanced request logging with timestamp and request ID
    console.log(`🔄 API Request [${new Date().toISOString()}] ID:${requestId}: /api/intelligence-pairing`, {
      method: req.method,
      headers: {
        contentType: req.headers['content-type'],
        hasAuth: !!req.headers['authorization'],
        hasCredentials: !!req.headers['cookie']
      },
      query: req.query || {},
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : []
    });

    if (req.method !== 'POST') {
      return res.status(405).json({ 
        error: 'Method Not Allowed',
        details: 'Only POST requests are supported',
        status: 405,
        success: false
      });
    }

    // Early validation of request body
    if (!req.body) {
      return res.status(400).json({
        error: 'Missing request body',
        status: 400,
        success: false
      });
    }

    // Extract fields with fallbacks
    const {
      lane_id,
      laneId,
      origin_city,
      originCity, 
      origin_state,
      originState,
      destination_city,
      destinationCity,
      dest_city,
      destination_state,
      destinationState,
      dest_state,
      equipment_code,
      equipmentCode = 'V',
      test_mode = false,
      mock_auth = false,
    } = req.body;

    // Normalize field names 
    const normalizedFields = {
      lane_id: lane_id || laneId,
      origin_city: origin_city || originCity,
      origin_state: origin_state || originState,
      destination_city: destination_city || destinationCity || dest_city,
      destination_state: destination_state || destinationState || dest_state,
      equipment_code: equipment_code || equipmentCode || 'V',
      test_mode: test_mode === true,
      mock_auth: mock_auth === true,
    };

    console.log('📦 Normalized payload:', JSON.stringify(normalizedFields));

    // Check required fields
    if (!normalizedFields.origin_city || !normalizedFields.origin_state || 
        !normalizedFields.destination_city || !normalizedFields.destination_state) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: { 
          origin_city: normalizedFields.origin_city, 
          origin_state: normalizedFields.origin_state,
          destination_city: normalizedFields.destination_city,
          destination_state: normalizedFields.destination_state 
        },
        status: 400,
        success: false
      });
    }
    
    // IMPROVED: Extract token using our enterprise-grade utility
    const { token: accessToken, source, error: extractionError } = extractAuthToken(req);
    
    // Get test mode configuration - always enable in development
    const isDev = process.env.NODE_ENV !== 'production';
    const testModeEnabled = isDev || process.env.ALLOW_TEST_MODE === 'true';
    const isTestRequest = normalizedFields.test_mode === true;
    const useTestMode = testModeEnabled && isTestRequest;
    
    // Get mock auth configuration for development
    const mockEnabled = isDev || process.env.ENABLE_MOCK_AUTH === 'true';
    const mockParam = req.query?.mock_auth || normalizedFields.mock_auth;
    // OVERRIDE for testing - Always enable mock auth when test_mode is true
    const useMockAuth = (mockEnabled && mockParam) || useTestMode || (isDev && normalizedFields.test_mode);
    
    // Extended debugging info for environment variables
    console.log('🔐 Auth Configuration:', { 
      isDev,
      testModeEnabled, 
      isTestRequest, 
      useTestMode, 
      mockEnabled, 
      mockParam, 
      useMockAuth,
      test_mode_value: normalizedFields.test_mode,
      mock_auth_value: normalizedFields.mock_auth,
      env_vars: {
        NODE_ENV: process.env.NODE_ENV,
        ALLOW_TEST_MODE: process.env.ALLOW_TEST_MODE,
        ENABLE_MOCK_AUTH: process.env.ENABLE_MOCK_AUTH
      }
    });
    
    // Add a special debug endpoint for diagnosing environment issues
    if (req.headers['x-debug-env'] === 'true' || normalizedFields.debug_env === true) {
      // Return environment diagnostic information
      return res.status(200).json({
        debug: true,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          ALLOW_TEST_MODE: process.env.ALLOW_TEST_MODE,
          ENABLE_MOCK_AUTH: process.env.ENABLE_MOCK_AUTH
        },
        computed: {
          isDev,
          testModeEnabled,
          isTestRequest,
          useTestMode,
          mockEnabled,
          useMockAuth
        },
        request: {
          test_mode: normalizedFields.test_mode,
          mock_auth: normalizedFields.mock_auth,
          hasToken: !!accessToken,
          tokenSource: source
        },
        timestamp: new Date().toISOString(),
        requestId
      });
    }
    
    if (!accessToken && !useMockAuth) {
      // Special debug handling for requests with X-Debug-Env header or debug_env flag
      if (req.headers['x-debug-env'] === 'true' || normalizedFields.debug_env === true) {
        console.log('⚠️ Debug info requested for auth configuration:', {
          ALLOW_TEST_MODE: process.env.ALLOW_TEST_MODE,
          NODE_ENV: process.env.NODE_ENV,
          ENABLE_MOCK_AUTH: process.env.ENABLE_MOCK_AUTH,
          isDev,
          testModeEnabled,
          isTestRequest: normalizedFields.test_mode,
          mockParam: normalizedFields.mock_auth,
          hasToken: !!accessToken
        });
      }
      
      console.error('❌ Authentication error: No valid token provided');
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Missing authentication token. Please provide a valid token via Authorization header.',
        code: 'AUTH_TOKEN_MISSING',
        success: false,
        debug: {
          test_mode: normalizedFields.test_mode,
          mock_auth: normalizedFields.mock_auth,
          useTestMode,
          useMockAuth
        }
      });
    }
    
    // Verify authentication if not using test mode or mock auth
    let authenticatedUser;
    
    if (useTestMode || useMockAuth) {
      console.log(useTestMode ? '🧪 Using TEST MODE authentication' : '⚠️ Using mock authentication');
      authenticatedUser = { 
        id: useTestMode ? 'test-mode-user' : 'mock-user-id',
        email: useTestMode ? 'test@rapidroutes.app' : 'mock@example.com',
        role: useTestMode ? 'test_user' : 'mock_user'
      };
    } else {
      // Validate the token with Supabase
      const { data, error } = await adminSupabase.auth.getUser(accessToken);
      
      if (error || !data.user) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          details: 'Authentication validation failed: ' + (error?.message || 'Invalid token'),
          code: 'AUTH_VALIDATION_ERROR',
          success: false
        });
      }
      
      authenticatedUser = data.user;
    }
    
    const normalize = (str) => str ? str.trim().toLowerCase() : '';

    // Lookup origin KMA
    const { data: originCityData, error: originError } = await adminSupabase
      .from('cities')
      .select('kma_code, kma_name, latitude, longitude, zip')
      .eq('city', normalize(normalizedFields.origin_city))
      .eq('state_or_province', normalizedFields.origin_state)
      .limit(1)
      .single();

    if (originError || !originCityData) {
      return res.status(400).json({
        error: 'Origin city not found in KMA lookup',
        details: { 
          origin_city: normalizedFields.origin_city, 
          origin_state: normalizedFields.origin_state, 
          originError: originError?.message || 'No matching city found'
        },
        status: 400,
        success: false
      });
    }

    // Lookup destination KMA
    const { data: destCityData, error: destError } = await adminSupabase
      .from('cities')
      .select('kma_code, kma_name, latitude, longitude, zip')
      .eq('city', normalize(normalizedFields.destination_city))
      .eq('state_or_province', normalizedFields.destination_state)
      .limit(1)
      .single();

    if (destError || !destCityData) {
      return res.status(400).json({
        error: 'Destination city not found in KMA lookup',
        details: { 
          destination_city: normalizedFields.destination_city, 
          destination_state: normalizedFields.destination_state, 
          destError: destError?.message || 'No matching city found'
        },
        status: 400,
        success: false
      });
    }

    // Format the origin and destination objects
    const origin = {
      city: normalizedFields.origin_city,
      state: normalizedFields.origin_state,
      kma_code: originCityData.kma_code,
      kma_name: originCityData.kma_name,
      latitude: Number(originCityData.latitude),
      longitude: Number(originCityData.longitude),
      zip: originCityData.zip
    };
    
    const destination = {
      city: normalizedFields.destination_city,
      state: normalizedFields.destination_state,
      kma_code: destCityData.kma_code,
      kma_name: destCityData.kma_name,
      latitude: Number(destCityData.latitude),
      longitude: Number(destCityData.longitude),
      zip: destCityData.zip
    };

    // Return successful response with KMA information
    return res.status(200).json({
      message: 'KMA lookup successful',
      requestId,
      success: true,
      origin,
      destination,
      equipment_code: normalizedFields.equipment_code,
      lane_id: normalizedFields.lane_id,
      user: authenticatedUser?.id || null,
      processingTimeMs: Date.now() - startTime
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
      requestId,
      success: false,
    });
  }
}
