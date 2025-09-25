/**
 * Intelligence API Adapter
 * 
 * This adapter ensures that requests to the intelligence-pairing API
 * are formatted correctly to avoid 400 Bad Request errors.
 * 
 * Key transformations:
 * 1. Renames dest_city/dest_state to destination_city/destination_state
 * 2. Converts all keys from camelCase to snake_case
 * 3. Ensures all required fields are present and non-empty
 * 
 * Required API parameters (snake_case):
 * - origin_city
 * - origin_state
 * - destination_city  (NOT dest_city)
 * - destination_state (NOT dest_state)
 * - equipment_code
 */

/**
 * Call the intelligence-pairing API with properly formatted parameters
 * to avoid 400 Bad Request errors
 * 
 * @param {Object} lane - Lane object with origin/destination information
 * @param {Object} options - Additional options for the API call
 * @param {boolean} options.useTestMode - Whether to use test mode (defaults to environment setting)
 * @param {Object} authSession - Authentication session containing access_token
 * @returns {Promise<Object>} - Response from intelligence-pairing API
 */
export async function callIntelligencePairingApi(lane, options = {}, authSession = null) {
  // Determine if we should use test mode
  const useTestMode = options.useTestMode !== undefined 
    ? options.useTestMode 
    : isTestModeAllowed();
  
  // Log incoming lane object to verify field availability
  console.log(`🔍 Intelligence adapter received lane ${lane.id} with fields:`, {
    id: lane.id,
    // Snake case
    origin_city: lane.origin_city,
    origin_state: lane.origin_state,
    destination_city: lane.destination_city,
    destination_state: lane.destination_state,
    // Camel case
    originCity: lane.originCity,
    originState: lane.originState,
    destinationCity: lane.destinationCity,
    destinationState: lane.destinationState
  });

  // Normalize all field name variants (camelCase + snake_case)
  const originCity = lane.originCity || lane.origin_city;
  const originState = lane.originState || lane.origin_state;
  const destinationCity = lane.destinationCity || lane.destination_city || lane.dest_city;
  const destinationState = lane.destinationState || lane.destination_state || lane.dest_state;
  const equipmentCode = lane.equipmentCode || lane.equipment_code;
  const laneId = lane.id || lane.lane_id;

  // Unified lane validation block
  const hasDestinationData = destinationCity || destinationState;
  if (!originCity || !originState || !equipmentCode || !hasDestinationData) {
    console.error(`❌ Lane ${laneId} invalid:`, {
      originCity: !!originCity,
      originState: !!originState,
      destinationCity: !!destinationCity,
      destinationState: !!destinationState,
      hasDestinationData,
      equipmentCode: !!equipmentCode
    });
    return false;
  }

  // First gather parameters in camelCase format and ensure defaults for critical fields
  const camelCasePayload = {
    laneId,
    originCity: originCity || '',
    originState: originState || '',
    originZip: lane.origin_zip || lane.originZip || '',
    destinationCity: destinationCity || '',
    destinationState: destinationState || '',
    destinationZip: lane.destination_zip || lane.destinationZip || '',
    equipmentCode: equipmentCode || 'V',
    test_mode: useTestMode
  };
  
  console.log(`🔄 Normalized camelCase payload for lane ${laneId}:`, camelCasePayload);
  
  // Helper function to convert camelCase keys to snake_case
  const toSnakeCase = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  
  // Convert all keys to snake_case for the backend
  const payload = Object.entries(camelCasePayload).reduce((acc, [key, value]) => {
    // test_mode is already snake_case
    const snakeKey = key === 'test_mode' ? key : toSnakeCase(key);
    acc[snakeKey] = value;
    return acc;
  }, {});
  
  // Accept if either destinationCity OR destinationState is provided
  // (removed duplicate declaration)
  
  // Log validation status but continue with API call
  if (!originCity || !originState || !equipmentCode || !hasDestinationData) {
    const missingFields = [];
    if (!originCity) missingFields.push('originCity/origin_city');
    if (!originState) missingFields.push('originState/origin_state');
    if (!hasDestinationData) missingFields.push('destination data (either city or state)');
    if (!equipmentCode) missingFields.push('equipmentCode/equipment_code');
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Missing required fields in payload:', missingFields);
      console.warn('⚠️ Lane will likely fail validation in API');
    }
  } else {
    // Log successful validation
    console.log(`✅ Lane ${laneId || 'new'} validation passed - proceeding with ${hasDestinationData ? (destinationCity && destinationState ? 'complete' : 'partial') : 'no'} destination data`);
  }

  try {
    // Prepare to send API request
    
    // Extra debugging for token issues
    console.log(`🔑 Auth token check for API call:`, {
      hasAuthSession: !!authSession,
      hasAccessToken: !!authSession?.access_token,
      tokenStart: authSession?.access_token ? authSession.access_token.substring(0, 10) + '...' : 'none'
    });
    
    const response = await fetch('/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": authSession?.access_token ? `Bearer ${authSession.access_token}` : ''
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        // Add status code to the error response for consistent handling
        errorData.status = response.status;
        errorData.statusCode = response.status;
        return errorData; // Return the error response with status code
      } catch (jsonError) {
        // If JSON parsing fails, get the text and create an error object
        const errorText = await response.text();
        return {
          success: false,
          error: errorText,
          status: response.status,
          statusCode: response.status
        };
      }
    }

    const jsonData = await response.json();
    // Add status code to the success response for consistent handling
    jsonData.status = response.status;
    jsonData.statusCode = response.status;
    return jsonData;
  } catch (error) {
    console.error('Intelligence API error:', error);
    throw error;
  }
}

/**
 * Check if the environment allows test mode
 * Use this to determine if test_mode flag should be sent
 * 
 * @returns {boolean} - Whether test mode is allowed
 */
export function isTestModeAllowed() {
  return process.env.NEXT_PUBLIC_ALLOW_TEST_MODE === 'true' || 
         process.env.NODE_ENV === 'development';
}