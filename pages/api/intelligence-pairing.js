// pages/api/intelligence-pairing.js
// API endpoint for geographic crawl intelligence pairing

import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';
import { extractAuthToken, getTokenInfo } from '../../utils/apiAuthUtils.js';

// Function to normalize field names from various input formats
const normalizeFields = (body) => {
  return {
    laneId: body.lane_id || body.laneId || '',
    originCity: body.origin_city || body.originCity || '',
    originState: body.origin_state || body.originState || '',
    originZip: body.origin_zip || body.originZip || '',
    destinationCity: body.destination_city || body.destCity || body.dest_city || body.destinationCity || '',
    destinationState: body.destination_state || body.destState || body.dest_state || body.destinationState || '',
    destinationZip: body.destination_zip || body.destZip || body.dest_zip || body.destinationZip || '',
    equipmentCode: body.equipment_code || body.equipmentCode || 'V',
    test_mode: body.test_mode || false,
    mock_auth: body.mock_auth || null,
  };
};

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
    const errorResponse = { 
      error: 'Method not allowed',
      details: 'Only POST requests are supported',
      status: 405,
      success: false
    };
    console.error('❌ API Error: Method not allowed:', {
      method: req.method,
      error: errorResponse
    });
    return res.status(405).json(errorResponse);
  }

  try {
    // Early validation of request body
    if (!req.body) {
      return res.status(400).json({
        error: 'Missing request body',
        status: 400,
        success: false
      });
    }

    // Log raw input body for debugging
    console.log("📦 API input body:", req.body);
    
    // Normalize all fields in one step
    const fields = normalizeFields(req.body);
    
    console.log('📦 Payload:', JSON.stringify(fields));
    
    // Check for missing required fields
    const missing = Object.entries(fields)
      .filter(([_, val]) => !val)
      .map(([key]) => key);
    
    // Fast-fail if any required fields are missing
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing,
        status: 400,
        success: false
      });
    }
    
    // Destructure the normalized fields for use in the rest of the function
    const { laneId, originCity, originState, originZip, destinationCity, destinationState, destinationZip, equipmentCode } = fields;

    console.log('📦 Processing payload:', JSON.stringify(req.body));
    
    // Debug log for normalized input values
    console.log("📥 Normalized origin input:", originCity, originState);
    
    // Log the validated fields for debugging
    console.log('✅ Validated payload fields:', {
      laneId,
      originCity,
      originState,
      originZip,
      destinationCity,
      destinationState,
      destinationZip,
      equipmentCode
    });

    // IMPROVED: Extract token using our enterprise-grade utility
    // This utility handles all token sources and formats
    const { token: accessToken, source, error: extractionError, ...tokenMetadata } = extractAuthToken(req);
    
    // Get test mode configuration
    const testModeEnabled = process.env.ALLOW_TEST_MODE === 'true';
    const isTestRequest = fields.test_mode === true;
    const useTestMode = testModeEnabled && isTestRequest;
    
    // Get mock auth configuration for development
    const mockEnabled = process.env.ENABLE_MOCK_AUTH === 'true' || process.env.NODE_ENV !== 'production';
    const mockParam = req.query?.mock_auth || fields.mock_auth;
    const useMockAuth = (mockEnabled && mockParam) || useTestMode;
    
    // If we have a token, get its decoded info for logging
    const tokenInfo = accessToken ? getTokenInfo(accessToken) : null;
    
    // Enhanced logging for authentication debugging
    console.log('🔐 API Authentication check:', {
      route: '/api/intelligence-pairing',
      hasToken: !!accessToken,
      tokenSource: source || 'none',
      tokenStart: tokenMetadata.tokenStart || 'none',
      extractionError: extractionError || null,
      mockEnabled: useMockAuth,
      testModeEnabled: useTestMode,
      method: req.method,
      cookieCount: tokenMetadata.cookies || 0,
      tokenMetadata,
      tokenValid: tokenInfo?.valid,
      tokenExpiresIn: tokenInfo?.expiresIn,
      userId: tokenInfo?.userId || null
    });
    
    if (!accessToken && !useMockAuth) {
      console.error('❌ Authentication error: No valid token provided', {
        authHeaderFormat: tokenMetadata.authHeaderFormat || 'missing',
        cookiesPresent: tokenMetadata.cookies > 0,
        method: req.method,
        path: req.url,
        extractionError
      });
      
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Missing authentication token. Please provide a valid token via Authorization header.',
        code: 'AUTH_TOKEN_MISSING',
        success: false
      });
    }
    
    // Import Supabase client once
    const { adminSupabase } = await import('../../utils/supabaseClient.js');
    
    // Verify the token with Supabase
    let authenticatedUser;
    
    try {
      // Handle test mode and mock auth
      if (useTestMode) {
        console.log('🧪 Using TEST MODE authentication - bypassing JWT validation');
        authenticatedUser = { 
          id: 'test-mode-user',
          email: 'test@rapidroutes.app',
          role: 'test_user'
        };
      } else if (useMockAuth) {
        console.log('⚠️ Using mock authentication (development only)');
        authenticatedUser = { 
          id: 'mock-user-id',
          email: 'mock@example.com',
          role: 'mock_user'
        };
      } else {
        // First do a quick check for obvious token expiration to avoid unnecessary API calls
        if (tokenInfo && !tokenInfo.valid) {
          const errorResponse = {
            error: 'Unauthorized',
            details: `Authentication token validation failed: ${tokenInfo.reason}`,
            code: tokenInfo.reason === 'Token expired' ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID',
            status: 401,
            success: false
          };
          
          console.error('❌ Token validation failed:', {
            reason: tokenInfo.reason,
            expiredAt: tokenInfo.expiresAt,
            userId: tokenInfo.userId,
            tokenStart: tokenMetadata.tokenStart
          });
          
          return res.status(401).json(errorResponse);
        }
        
        // Validate that adminSupabase is available
        if (!adminSupabase) {
          console.error('❌ Critical server error: adminSupabase client not initialized');
          return res.status(500).json({ 
            error: 'Internal Server Error', 
            details: 'Authentication service unavailable',
            code: 'AUTH_SERVICE_UNAVAILABLE',
            status: 500,
            success: false 
          });
        }
        
        try {
          // Use adminSupabase to validate the token with Supabase Auth
          const { data, error } = await adminSupabase.auth.getUser(accessToken);
          
          if (error || !data?.user) {
            const errorResponse = {
              error: 'Unauthorized',
              details: error?.message || 'Invalid authentication token',
              code: error?.code || 'AUTH_INVALID_TOKEN',
              status: 401,
              success: false
            };
            
            console.error('❌ Token validation error:', {
              errorType: error?.name,
              errorMessage: error?.message,
              status: error?.status,
              hasUser: !!data?.user,
              tokenInfo: tokenInfo ? {
                userId: tokenInfo.userId,
                expiresAt: tokenInfo.expiresAt
              } : 'Unable to decode'
            });
            
            return res.status(401).json(errorResponse);
          }
          
          // Authentication successful - save the user
          authenticatedUser = data.user;
        } catch (supabaseError) {
          console.error('❌ Supabase authentication error:', supabaseError);
          return res.status(500).json({
            error: 'Internal Server Error',
            details: 'Authentication service error',
            code: 'AUTH_SERVICE_ERROR',
            status: 500,
            success: false
          });
        }
      }
      
      console.log('✅ Authentication successful:', {
        userId: authenticatedUser.id,
        email: authenticatedUser.email,
        tokenSource: source || 'mock',
        expiresAt: tokenInfo?.expiresAt || 'N/A',
        route: '/api/intelligence-pairing'
      });
    } catch (authError) {
      console.error('❌ Token validation exception:', authError);
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Authentication validation failed: ' + authError.message,
        code: 'AUTH_VALIDATION_ERROR',
        success: false
      });
    }
    
    // Now we can safely use the authenticated user information
    console.log(`🎯 INTELLIGENCE API: Starting pairing for ${originCity}, ${originState} → ${destinationCity}, ${destinationState}`, {
      laneId,
      originCity,
      originState,
      originZip,
      destinationCity,
      destinationState,
      destinationZip,
      equipmentCode
    });
    
    // Enhanced logging for Supabase client validation
    console.log('🔄 Validating Supabase client connection...');
    const testQuery = await adminSupabase.from('cities').select('count').limit(1);
    if (testQuery.error) {
      console.error('❌ Supabase connection error:', testQuery.error);
      throw new Error(`Database connection error: ${testQuery.error.message}`);
    } else {
      console.log('✅ Supabase connection valid');
    }
    
    // Fetch origin coordinates
    const { data: originData, error: originError } = await adminSupabase
      .from('cities')
      .select('latitude, longitude, zip, kma_code, kma_name')
      .eq('city', originCity)
      .eq('state_or_province', originState)
      .limit(1);
      
    if (originError) {
      throw new Error(`Failed to fetch origin coordinates: ${originError.message}`);
    }
    
    if (!originData || originData.length === 0) {
      throw new Error(`Origin city not found: ${originCity}, ${originState}`);
    }
    
    // Fetch destination coordinates
    const { data: destinationData, error: destinationError } = await adminSupabase
      .from('cities')
      .select('latitude, longitude, zip')
      .eq('city', destinationCity)
      .eq('state_or_province', destinationState)
      .limit(1);
      
    if (destinationError) {
      throw new Error(`Failed to fetch destination coordinates: ${destinationError.message}`);
    }
    
    if (!destinationData || destinationData.length === 0) {
      throw new Error(`Destination city not found: ${destinationCity}, ${destinationState}`);
    }
    
    const origin = {
      city: originCity,
      state: originState,
      latitude: Number(originData[0].latitude),
      longitude: Number(originData[0].longitude),
      zip: originData[0].zip
    };
    
    const destination = {
      city: destinationCity,
      state: destinationState,
      latitude: Number(destinationData[0].latitude),
      longitude: Number(destinationData[0].longitude),
      zip: destinationData[0].zip
    };

    // Now call with complete data
    const result = await generateGeographicCrawlPairs(origin, destination, equipmentCode);

    if (!result || !Array.isArray(result.pairs)) {
      throw new Error('Invalid response from intelligence system');
    }

    // Import the normalization function
    const { normalizePairing } = await import('../../lib/validatePairings.js');
    
    // Normalize all pairs to ensure consistent format with camelCase field names
    let pairs = result.pairs.map(pair => {
      try {
        const normalized = normalizePairing(pair);
        
        if (normalized) {
          return {
            // Standard camelCase format (primary)
            laneId,
            originCity: normalized.origin_city || normalized.originCity,
            originState: normalized.origin_state || normalized.originState,
            originZip: normalized.origin_zip || normalized.originZip,
            originKma: normalized.origin_kma || normalized.originKma,
            destinationCity: normalized.dest_city || normalized.destCity || normalized.destinationCity,
            destinationState: normalized.dest_state || normalized.destState || normalized.destinationState,
            destinationZip: normalized.dest_zip || normalized.destZip || normalized.destinationZip,
            destinationKma: normalized.dest_kma || normalized.destKma || normalized.destinationKma,
            distanceMiles: normalized.distance_miles || normalized.distanceMiles,
            equipmentCode: normalized.equipment_code || normalized.equipmentCode,
            
            // Legacy snake_case format for backward compatibility
            origin_city: normalized.origin_city || normalized.originCity,
            origin_state: normalized.origin_state || normalized.originState,
            origin_zip: normalized.origin_zip || normalized.originZip,
            origin_kma: normalized.origin_kma || normalized.originKma,
            dest_city: normalized.dest_city || normalized.destCity,
            dest_state: normalized.dest_state || normalized.destState,
            dest_zip: normalized.dest_zip || normalized.destZip,
            dest_kma: normalized.dest_kma || normalized.destKma,
            distance_miles: normalized.distance_miles || normalized.distanceMiles,
            equipment_code: normalized.equipment_code || normalized.equipmentCode,
            
            // Legacy camelCase format with "dest" prefix for backward compatibility
            destCity: normalized.dest_city || normalized.destCity,
            destState: normalized.dest_state || normalized.destState,
            destZip: normalized.dest_zip || normalized.destZip,
            destKma: normalized.dest_kma || normalized.destKma
          };
        }
        return null;
      } catch (error) {
        console.error('Error normalizing pair:', error);
        return null;
      }
    });
    
    // Filter out any null/invalid pairs after normalization
    pairs = pairs.filter(pair => pair !== null);
    
    const count = pairs.length;

    if (count < 6) {
      console.warn(`⚠️ INTELLIGENCE API: Generated only ${count} pairs, minimum required is 6`);
      return res.status(422).json({
        error: 'Insufficient pairs generated',
        details: `Only ${count} pairs were generated. At least 6 pairs are required.`,
        pairs: [],
        count: 0,
        minRequired: 6,
        success: false
      });
    }
    
    // Count unique KMAs to ensure we meet the minimum requirement
    const kmas = new Set();
    pairs.forEach(pair => {
      if (pair.originKma) kmas.add(pair.originKma);
      if (pair.destinationKma) kmas.add(pair.destinationKma);
    });
    
    // Match the MIN_UNIQUE_KMAS requirement from geographicCrawl.js (6 unique KMAs)
    const MIN_REQUIRED_KMAS = 6;
    
    if (kmas.size < MIN_REQUIRED_KMAS) {
      console.warn(`⚠️ INTELLIGENCE API: Only ${kmas.size} unique KMAs found, minimum required is ${MIN_REQUIRED_KMAS}`);
      return res.status(422).json({
        error: 'Insufficient KMA diversity',
        details: `Only ${kmas.size} unique KMAs were found. At least ${MIN_REQUIRED_KMAS} unique KMAs are required.`,
        pairs: [],
        count: 0,
        uniqueKmas: kmas.size,
        minRequired: MIN_REQUIRED_KMAS,
        success: false
      });
    }

    console.log(`✅ INTELLIGENCE API: Generated ${count} pairs`);

    res.status(200).json({
      success: true,
      pairs,
      count,
      debug: result?.debug || {}
    });

  } catch (error) {
    // Enhanced error logging with full stack trace for Vercel debugging
    console.error(`❌ Intelligence API error [ID:${requestId}]:`, error);
    console.error('Stack trace:', error.stack);
    
    // Log detailed request information for debugging production issues
    console.error(`📊 Failed request details [ID:${requestId}]:`, {
      method: req.method,
      url: req.url,
      body: req.body ? JSON.stringify(req.body).substring(0, 1000) : null, // Truncate for logs
      headers: {
        contentType: req.headers['content-type'],
        hasAuth: !!req.headers['authorization'],
        authStart: req.headers['authorization'] 
          ? req.headers['authorization'].substring(0, 15) + '...' 
          : 'none'
      },
      processingTime: `${Date.now() - startTime}ms`,
      errorType: error.name,
      statusCode: error.status || 500
    });
    
    // Determine if this is an auth error or another type
    const isAuthError = error.message?.toLowerCase().includes('auth') || 
                        error.message?.toLowerCase().includes('token') ||
                        error.message?.toLowerCase().includes('unauthorized');
    
    const statusCode = isAuthError ? 401 : (error.status || 500);
    
    // Return detailed error information in JSON response that matches our success format
    res.status(statusCode).json({ 
      error: isAuthError ? 'Unauthorized' : 'Processing Error',
      details: error.message || 'Failed to generate intelligence pairs',
      code: isAuthError ? 'AUTH_ERROR' : 'PROCESSING_ERROR',
      status: statusCode,
      requestId: requestId,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      success: false,
      pairs: []
    });
  }
  } catch (outerError) {
    // Ultimate fallback for any uncaught errors
    console.error(`💥 CRITICAL: Uncaught error in API handler [ID:${requestId}]:`, outerError);
    console.error('Outer stack trace:', outerError.stack);
    
    // Return a safe error response
    res.status(500).json({
      error: 'Critical Server Error',
      details: 'An unexpected error occurred while processing your request',
      status: 500,
      requestId: requestId,
      timestamp: new Date().toISOString(),
      success: false
    });
  }
}