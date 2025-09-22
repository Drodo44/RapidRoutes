import { extractAuthToken, getTokenInfo } from '../../utils/apiAuthUtils.js';

export default async function handler(req, res) {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  console.log(`📥 [${requestId}] Incoming request body:`, JSON.stringify(req.body));

  const body = req.body;

  // Normalize and extract required fields from both camelCase and snake_case
  const {
    lane_id,
    laneId = lane_id,
    origin_city,
    originCity = origin_city,
    origin_state,
    originState = origin_state,
    destination_city,
    dest_city,
    destCity,
    destinationCity = destination_city || dest_city || destCity,
    destination_state,
    dest_state,
    destState,
    destinationState = destination_state || dest_state || destState,
    equipment_code,
    equipmentCode = equipment_code || 'V',
  } = body;

  // Build required fields object
  const requiredFields = {
    laneId,
    originCity,
    originState,
    destinationCity,
    destinationState,
    equipmentCode,
  };

  // Check for missing fields
  const missing = Object.entries(requiredFields)
    .filter(([_, val]) => !val)
    .reduce((acc, [key]) => ({ ...acc, [key]: true }), {});

  if (Object.keys(missing).length > 0) {
    console.error(`❌ [${requestId}] Missing fields:`, missing);
    return res.status(400).json({
      error: 'Missing required fields',
      missing,
      status: 400,
      success: false,
    });
  }

  console.log(`✅ [${requestId}] Normalized input:`, requiredFields);

  try {
    // Validate authentication
    const { token: accessToken, source, error: extractionError } = extractAuthToken(req);
    
    if (!accessToken) {
      console.error(`❌ [${requestId}] Authentication error: No valid token provided`);
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Missing authentication token',
        code: 'AUTH_TOKEN_MISSING',
        success: false
      });
    }
    
    // Import Supabase client for database operations
    const { adminSupabase } = await import('../../utils/supabaseClient.js');
    
    // Fetch origin coordinates
    const { data: originData, error: originError } = await adminSupabase
      .from('cities')
      .select('latitude, longitude, zip, kma_code, kma_name')
      .eq('city', requiredFields.originCity)
      .eq('state_or_province', requiredFields.originState)
      .limit(1);
      
    if (originError) {
      console.error(`❌ [${requestId}] Database error:`, originError);
      throw new Error(`Failed to fetch origin coordinates: ${originError.message}`);
    }
    
    if (!originData || originData.length === 0) {
      console.error(`❌ [${requestId}] Origin city not found:`, requiredFields.originCity, requiredFields.originState);
      return res.status(404).json({
        error: 'Origin city not found',
        details: `No match found for ${requiredFields.originCity}, ${requiredFields.originState}`,
        status: 404,
        success: false
      });
    }
    
    // Fetch destination coordinates
    const { data: destinationData, error: destinationError } = await adminSupabase
      .from('cities')
      .select('latitude, longitude, zip, kma_code, kma_name')
      .eq('city', requiredFields.destinationCity)
      .eq('state_or_province', requiredFields.destinationState)
      .limit(1);
      
    if (destinationError) {
      console.error(`❌ [${requestId}] Database error:`, destinationError);
      throw new Error(`Failed to fetch destination coordinates: ${destinationError.message}`);
    }
    
    if (!destinationData || destinationData.length === 0) {
      console.error(`❌ [${requestId}] Destination city not found:`, requiredFields.destinationCity, requiredFields.destinationState);
      return res.status(404).json({
        error: 'Destination city not found',
        details: `No match found for ${requiredFields.destinationCity}, ${requiredFields.destinationState}`,
        status: 404,
        success: false
      });
    }
    
    // Return the KMA information
    res.status(200).json({
      success: true,
      requestId,
      origin: {
        city: requiredFields.originCity,
        state: requiredFields.originState,
        kma_code: originData[0].kma_code,
        kma_name: originData[0].kma_name,
      },
      destination: {
        city: requiredFields.destinationCity,
        state: requiredFields.destinationState,
        kma_code: destinationData[0].kma_code,
        kma_name: destinationData[0].kma_name,
      }
    });
    
  } catch (error) {
    console.error(`❌ [${requestId}] Error processing request:`, error);
    res.status(500).json({
      error: 'Processing Error',
      details: error.message || 'Failed to process KMA lookup',
      status: 500,
      requestId,
      timestamp: new Date().toISOString(),
      success: false
    });
  }
}