// pages/api/intelligence-pairing.js
// API endpoint for geographic crawl intelligence pairing

import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { originCity, originState, destCity, destState } = req.body;

    if (!originCity || !originState || !destCity || !destState) {
      return res.status(400).json({ 
        error: 'Missing required fields: originCity, originState, destCity, destState' 
      });
    }

    // Extract token from either Bearer header or cookies
    const authHeader = req.headers.authorization || '';
    const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const cookieToken =
      req.cookies?.['sb-access-token'] ||
      req.cookies?.['supabase-auth-token'] ||
      req.cookies?.['sb:token'] || null;
    const accessToken = bearer || cookieToken;
    
    // Log authentication details (without exposing token)
    console.log({
      route: '/api/intelligence-pairing',
      hasAuthHeader: !!authHeader,
      hasBearer: !!bearer,
      hasCookieToken: !!cookieToken,
      hasToken: !!accessToken,
      cookies: Object.keys(req.cookies || {})
    });
    
    if (!accessToken) {
      console.error('Authentication error: No valid token provided', {
        authHeaderExists: !!authHeader,
        bearerFormat: authHeader ? authHeader.startsWith('Bearer ') : false,
        cookiesPresent: Object.keys(req.cookies || {})
      });
      return res.status(401).json({ 
        error: true, 
        message: 'Missing Supabase access token' 
      });
    }
    
    // Import Supabase client once
    const { adminSupabase } = await import('../../utils/supabaseClient.js');
    
    // Verify the token with Supabase
    try {
      const { data, error } = await adminSupabase.auth.getUser(accessToken);
      
      if (error || !data?.user) {
        console.error('Token validation error:', {
          errorType: error?.name,
          errorMessage: error?.message,
          status: error?.status,
          hasUser: !!data?.user
        });
        
        return res.status(401).json({ 
          error: true, 
          message: error?.message || 'Invalid authentication token',
          code: error?.code || 'AUTH_INVALID_TOKEN'
        });
      }
      
      // Authentication successful
      const user = data.user;
      console.log('Authentication successful:', {
        userId: user.id,
        email: user.email,
        route: '/api/intelligence-pairing'
      });
    } catch (authError) {
      console.error('Token validation exception:', authError);
      return res.status(401).json({ 
        error: true, 
        message: 'Authentication validation failed',
        code: 'AUTH_VALIDATION_ERROR'
      });
    }
    
    console.log(`🎯 INTELLIGENCE API: Starting pairing for ${originCity}, ${originState} → ${destCity}, ${destState}`, {
      userId: data?.user?.id,
      email: data?.user?.email,
      originCity,
      originState,
      destCity,
      destState,
      hasEquipment: !!req.body.equipmentCode
    });
    
    // Fetch origin coordinates
    const { data: originData, error: originError } = await adminSupabase
      .from('cities')
      .select('latitude, longitude, zip')
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
    
    // Normalize all pairs to ensure consistent format
    let pairs = result.pairs.map(pair => normalizePairing(pair));
    
    // Filter out any null/invalid pairs after normalization
    pairs = pairs.filter(pair => pair !== null);
    
    const count = pairs.length;

    if (count < 6) {
      console.warn(`⚠️ INTELLIGENCE API: Generated only ${count} pairs, minimum required is 6`);
      return res.status(422).json({
        error: 'Insufficient pairs generated',
        pairs: [],
        count: 0,
        minRequired: 6
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
    
    // Return detailed error information in JSON response
    res.status(statusCode).json({ 
      error: true,
      message: error.message || 'Failed to generate intelligence pairs',
      code: isAuthError ? 'AUTH_ERROR' : 'PROCESSING_ERROR',
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
      success: false,
      pairs: []
    });
  }
}