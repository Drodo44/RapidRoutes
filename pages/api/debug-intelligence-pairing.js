// pages/api/debug-intelligence-pairing.js
// Debug version of the intelligence-pairing API handler with enhanced error reporting
// This file should NOT be used in production - it's for debugging only

import { extractAuthToken } from '../../utils/apiAuthUtils.js';
import supabaseAdmin from "@/lib/supabaseAdmin";
import { generateGeographicCrawlPairs } from '../../lib/geographicCrawl.js';

export default async function handler(req, res) {
  // Track request handling time for performance monitoring
  const startTime = Date.now();
  const requestId = `debug-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

  try {
    // Enhanced request logging with timestamp and request ID
    console.log(`🔄 DEBUG API Request [${new Date().toISOString()}] ID:${requestId}: /api/debug-intelligence-pairing`, {
      method: req.method,
      headers: {
        contentType: req.headers['content-type'],
        hasAuth: !!req.headers['authorization'],
        hasCredentials: !!req.headers['cookie']
      },
      query: req.query || {},
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      rawBody: JSON.stringify(req.body) // Log the full raw body for debugging
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
      equipmentCode,
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
      equipment_code: equipment_code || equipmentCode || 'V', // Default to 'V' if not provided
      test_mode: test_mode === true,
      mock_auth: mock_auth === true,
    };

    console.log('📦 DEBUG Normalized payload:', JSON.stringify(normalizedFields));

    // Check required fields with detailed error reporting
    const missingFields = [];
    if (!normalizedFields.origin_city) missingFields.push('origin_city/originCity');
    if (!normalizedFields.origin_state) missingFields.push('origin_state/originState');
    if (!normalizedFields.destination_city) missingFields.push('destination_city/destinationCity/dest_city');
    if (!normalizedFields.destination_state) missingFields.push('destination_state/destinationState/dest_state');
    if (!normalizedFields.equipment_code) missingFields.push('equipment_code/equipmentCode');
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: { 
          missingFields,
          receivedFields: normalizedFields 
        },
        status: 400,
        success: false
      });
    }
    
    // For debug endpoint, always enable test mode
    const useTestMode = true;
    console.log('🧪 DEBUG test mode is enabled');
    
    // Debug authentication is always successful
    const authenticatedUser = { 
      id: 'debug-user-id',
      email: 'debug@example.com',
      role: 'debug_user'
    };
    
    // Get access to admin Supabase for database operations
    try {
      // Call the geographicCrawl function
      console.log('🔍 DEBUG Calling geographic crawl function with params:', {
        originCity: normalizedFields.origin_city,
        originState: normalizedFields.origin_state,
        destinationCity: normalizedFields.destination_city,
        destinationState: normalizedFields.destination_state,
        equipmentCode: normalizedFields.equipment_code
      });
      
      const result = await generateGeographicCrawlPairs({
        originCity: normalizedFields.origin_city,
        originState: normalizedFields.origin_state,
        destCity: normalizedFields.destination_city,
        destState: normalizedFields.destination_state,
        equipmentCode: normalizedFields.equipment_code
      }, adminSupabase);
      
      // Log and validate the crawl result
      console.log(`✅ DEBUG Crawl completed with ${result?.pairs?.length || 0} pairs`);
      
      // Send the result
      return res.status(200).json({
        success: true,
        ...result,
        debug: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      // Detailed error logging
      console.error('❌ DEBUG Crawl error:', {
        message: error.message,
        stack: error.stack,
        params: {
          originCity: normalizedFields.origin_city,
          originState: normalizedFields.origin_state,
          destCity: normalizedFields.destination_city,
          destState: normalizedFields.destination_state,
          equipmentCode: normalizedFields.equipment_code
        }
      });
      
      return res.status(500).json({
        error: 'Geographic crawl failed',
        details: error.message,
        success: false,
        status: 500,
        debug: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          errorStack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        }
      });
    }
    
  } catch (error) {
    // Catch-all error handler
    console.error(`❌ DEBUG Unhandled error in API: ${error.message}`, {
      stack: error.stack,
      requestId
    });
    
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      success: false,
      status: 500,
      debug: {
        requestId,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        errorStack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      }
    });
  }
}