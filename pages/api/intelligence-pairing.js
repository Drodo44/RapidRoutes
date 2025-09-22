// pages/api/intelligence-pairing.js
// API endpoint for geographic crawl intelligence pairing

import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      details: 'Only POST requests are supported',
      success: false
    });
  }

  try {
    // Support both camelCase (frontend) and snake_case field naming conventions
    const originCity = req.body.originCity || req.body.origin_city;
    const originState = req.body.originState || req.body.origin_state;
    const originZip = req.body.originZip || req.body.origin_zip;
    const destCity = req.body.destCity || req.body.dest_city;
    const destState = req.body.destState || req.body.dest_state;
    const destZip = req.body.destZip || req.body.dest_zip;
    const equipmentCode = req.body.equipmentCode || req.body.equipment_code;

    if (!originCity || !originState || !destCity || !destState) {
      return res.status(400).json({ 
        error: 'Bad Request',
        details: 'Missing required fields: originCity/origin_city, originState/origin_state, destCity/dest_city, destState/dest_state',
        success: false
      });
    }

    // IMPROVED: Extract token from multiple potential sources with fallbacks
    // 1. Authorization header (Bearer token)
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    // 2. Various cookie formats that might contain the token
    let cookieToken = null;
    try {
      // Direct cookie access for standard formats
      cookieToken = req.cookies?.['sb-access-token'] ||
        req.cookies?.['sb:token'] ||
        req.cookies?.['supabase-auth-token'];
      
      // Parse JSON cookie formats if present
      if (!cookieToken && req.cookies?.['supabase-auth-token']) {
        try {
          const parsed = JSON.parse(req.cookies['supabase-auth-token']);
          cookieToken = parsed?.access_token || parsed?.[0]?.access_token;
          console.log('✅ Parsed standard Supabase cookie:', cookieToken ? 'token found' : 'no token');
        } catch (e) {
          console.warn('Failed to parse supabase-auth-token cookie:', e.message);
        }
      }
      
      // ENHANCEMENT: Allow test mode for local development
      // This enables testing without authentication in non-production environments
      const isTestMode = process.env.NODE_ENV !== 'production' && req.body?.test_mode === true;
      
      // Try to parse the 'sb-' prefixed cookies which might contain tokens
      if (!cookieToken) {
        const possibleTokenCookies = Object.keys(req.cookies || {})
          .filter(key => key.startsWith('sb-'));
          
        console.log(`🔍 Checking ${possibleTokenCookies.length} sb- prefixed cookies for tokens`);
        for (const key of possibleTokenCookies) {
          try {
            const parsed = JSON.parse(req.cookies[key]);
            if (parsed?.access_token) {
              cookieToken = parsed.access_token;
              console.log(`✅ Found token in cookie: ${key}`);
              break;
            }
          } catch (e) {
            // Ignore parsing errors and continue
            console.debug(`Could not parse cookie ${key}: ${e.message}`);
          }
        }
      }
    } catch (cookieError) {
      console.warn('Cookie parsing error:', cookieError.message);
    }
    
    // 3. Test mode configuration
    // Allow test mode when explicitly enabled via environment variable
    const testModeEnabled = process.env.ALLOW_TEST_MODE === 'true';
    const isTestRequest = req.body?.test_mode === true;
    const useTestMode = testModeEnabled && isTestRequest;
    
    // 4. Mock auth for development/testing only
    const mockEnabled = process.env.ENABLE_MOCK_AUTH === 'true' || process.env.NODE_ENV !== 'production';
    const mockParam = req.query?.mock_auth || req.body?.mock_auth;
    const mockToken = (mockEnabled && mockParam) || useTestMode ? 'mock-token' : null;
    
    // Use the first available token source in order of preference
    const accessToken = bearer || cookieToken || mockToken;
    
    // Enhanced logging for authentication debugging
    console.log('🔐 API Authentication check:', {
      route: '/api/intelligence-pairing',
      hasAuthHeader: !!authHeader,
      hasBearer: !!bearer,
      hasCookieToken: !!cookieToken,
      mockAuthEnabled: mockEnabled && !!mockParam,
      testModeEnabled: useTestMode,
      hasToken: !!accessToken,
      method: req.method,
      cookieCount: Object.keys(req.cookies || {}).length,
      tokenSource: bearer ? 'bearer' : (cookieToken ? 'cookie' : (mockToken ? 'mock' : 'none'))
    });
    
    if (!accessToken) {
      console.error('❌ Authentication error: No valid token provided', {
        authHeaderExists: !!authHeader,
        bearerFormat: authHeader ? authHeader.startsWith('Bearer ') : false,
        cookiesPresent: Object.keys(req.cookies || {}).length > 0,
        headers: Object.keys(req.headers || {})
      });
      
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Missing authentication token. Please provide a valid token via Authorization header or cookies.',
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
      } else if (mockToken === accessToken) {
        console.log('⚠️ Using mock authentication (development only)');
        authenticatedUser = { 
          id: 'mock-user-id',
          email: 'mock@example.com',
          role: 'mock_user'
        };
      } else {
        // Use adminSupabase to validate the token
        const { data, error } = await adminSupabase.auth.getUser(accessToken);
        
        if (error || !data?.user) {
          console.error('❌ Token validation error:', {
            errorType: error?.name,
            errorMessage: error?.message,
            status: error?.status,
            hasUser: !!data?.user,
            tokenStart: accessToken.substring(0, 10) + '...'
          });
          
          return res.status(401).json({ 
            error: 'Unauthorized',
            details: error?.message || 'Invalid authentication token',
            code: error?.code || 'AUTH_INVALID_TOKEN',
            success: false
          });
        }
        
        // Authentication successful - save the user
        authenticatedUser = data.user;
      }
      
      console.log('✅ Authentication successful:', {
        userId: authenticatedUser.id,
        email: authenticatedUser.email,
        route: '/api/intelligence-pairing'
      });
    } catch (authError) {
      console.error('❌ Token validation exception:', authError);
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Authentication validation failed',
        code: 'AUTH_VALIDATION_ERROR',
        success: false
      });
    }
    
    // Now we can safely use the authenticated user information
    console.log(`🎯 INTELLIGENCE API: Starting pairing for ${originCity}, ${originState} → ${destCity}, ${destState}`, {
      userId: authenticatedUser?.id,
      email: authenticatedUser?.email,
      originCity,
      originState,
      destCity,
      destState,
      hasEquipment: !!req.body.equipmentCode
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
    const { data: destData, error: destError } = await adminSupabase
      .from('cities')
      .select('latitude, longitude, zip')
      .eq('city', destCity)
      .eq('state_or_province', destState)
      .limit(1);
      
    if (destError) {
      throw new Error(`Failed to fetch destination coordinates: ${destError.message}`);
    }
    
    if (!destData || destData.length === 0) {
      throw new Error(`Destination city not found: ${destCity}, ${destState}`);
    }
    
    const origin = {
      city: originCity,
      state: originState,
      latitude: Number(originData[0].latitude),
      longitude: Number(originData[0].longitude),
      zip: originData[0].zip
    };
    
    const destination = {
      city: destCity,
      state: destState,
      latitude: Number(destData[0].latitude),
      longitude: Number(destData[0].longitude),
      zip: destData[0].zip
    };

    // Now call with complete data
    const result = await generateGeographicCrawlPairs(origin, destination);

    if (!result || !Array.isArray(result.pairs)) {
      throw new Error('Invalid response from intelligence system');
    }

    // Import the normalization function
    const { normalizePairing } = await import('../../lib/validatePairings.js');
    
    // Normalize all pairs to ensure consistent format and include BOTH naming conventions
    // This ensures maximum compatibility with all client implementations
    let pairs = result.pairs.map(pair => {
      try {
        const normalized = normalizePairing(pair);
        
        // Ensure all required fields exist in both formats for maximum compatibility
        if (normalized) {
          // Ensure both camelCase and snake_case formats exist for all fields
          return {
            // Original snake_case format
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
            
            // Additional camelCase format
            originCity: normalized.origin_city || normalized.originCity,
            originState: normalized.origin_state || normalized.originState,
            originZip: normalized.origin_zip || normalized.originZip,
            originKma: normalized.origin_kma || normalized.originKma,
            destCity: normalized.dest_city || normalized.destCity,
            destState: normalized.dest_state || normalized.destState,
            destZip: normalized.dest_zip || normalized.destZip,
            destKma: normalized.dest_kma || normalized.destKma,
            distanceMiles: normalized.distance_miles || normalized.distanceMiles,
            equipmentCode: normalized.equipment_code || normalized.equipmentCode
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
      if (pair.origin_kma) kmas.add(pair.origin_kma);
      if (pair.dest_kma) kmas.add(pair.dest_kma);
    });
    
    if (kmas.size < 5) {
      console.warn(`⚠️ INTELLIGENCE API: Only ${kmas.size} unique KMAs found, minimum required is 5`);
      return res.status(422).json({
        error: 'Insufficient KMA diversity',
        details: `Only ${kmas.size} unique KMAs were found. At least 5 unique KMAs are required.`,
        pairs: [],
        count: 0,
        uniqueKmas: kmas.size,
        minRequired: 5,
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
    console.error('❌ Intelligence API error:', error);
    console.error('Stack trace:', error.stack);
    
    // Determine if this is an auth error or another type
    const isAuthError = error.message?.toLowerCase().includes('auth') || 
                        error.message?.toLowerCase().includes('token') ||
                        error.message?.toLowerCase().includes('unauthorized');
    
    const statusCode = isAuthError ? 401 : 500;
    
    // Return detailed error information in JSON response that matches our success format
    res.status(statusCode).json({ 
      error: isAuthError ? 'Unauthorized' : 'Processing Error',
      details: error.message || 'Failed to generate intelligence pairs',
      code: isAuthError ? 'AUTH_ERROR' : 'PROCESSING_ERROR',
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      success: false,
      pairs: []
    });
  }
}