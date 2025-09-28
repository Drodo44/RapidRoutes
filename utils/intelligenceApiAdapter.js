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
  const {
    useTestMode: optTestMode,
    timeoutMs = 12000,
    debug = false,
    stub = true // allow stub generation in debug
  } = options || {};

  const useTestMode = optTestMode !== undefined ? optTestMode : isTestModeAllowed();

  const log = (...args) => { if (debug) console.log(...args); };
  const warn = (...args) => { if (debug) console.warn(...args); };
  const errLog = (...args) => console.error(...args); // always log errors

  log(`🔍 Intelligence adapter received lane ${lane?.id}`, {
    id: lane?.id,
    origin_city: lane?.origin_city,
    origin_state: lane?.origin_state,
    destination_city: lane?.destination_city,
    destination_state: lane?.destination_state,
    originCity: lane?.originCity,
    originState: lane?.originState,
    destinationCity: lane?.destinationCity,
    destinationState: lane?.destinationState
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
    const validationError = {
      error: 'MISSING_REQUIRED_FIELDS',
      details: {
        originCity: !!originCity,
        originState: !!originState,
        destinationCity: !!destinationCity,
        destinationState: !!destinationState,
        hasDestinationData,
        equipmentCode: !!equipmentCode
      },
      status: 400,
      statusCode: 400
    };
    errLog(`❌ Lane ${laneId} invalid`, validationError.details);
    return validationError;
  }

  // Debug stub short-circuit (no backend call) to enable frontend smoke tests without HERE API key
  if (debug && stub && (process.env.NEXT_PUBLIC_PAIRING_DEBUG === 'true' || typeof window !== 'undefined' && window.location.search.includes('debug=1'))) {
    log('🧪 Returning debug stub pairing data (no API call)');
    const samplePairs = [
      {
        origin: { city: originCity, state: originState, zip: '31750', kma: 'OR1' },
        destination: { city: destinationCity || destinationState + ' City', state: destinationState || destinationCity?.split(',')[1] || 'ST', zip: '33880', kma: 'DS1' }
      },
      {
        origin: { city: originCity, state: originState, zip: '31750', kma: 'OR2' },
        destination: { city: destinationCity || destinationState + ' Hub', state: destinationState || 'ST', zip: '33801', kma: 'DS2' }
      },
      {
        origin: { city: originCity, state: originState, zip: '31750', kma: 'OR3' },
        destination: { city: destinationCity || destinationState + ' Center', state: destinationState || 'ST', zip: '33830', kma: 'DS3' }
      }
    ];
    return {
      status: 200,
      statusCode: 200,
      dataSourceType: 'stub',
      totalCityPairs: samplePairs.length,
      uniqueOriginKmas: 3,
      uniqueDestKmas: 3,
      pairs: samplePairs
    };
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
  
  log(`🔄 Normalized camelCase payload for lane ${laneId}:`, camelCasePayload);
  
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
  if (debug) {
    if (!originCity || !originState || !equipmentCode || !hasDestinationData) {
      const missingFields = [];
      if (!originCity) missingFields.push('originCity/origin_city');
      if (!originState) missingFields.push('originState/origin_state');
      if (!hasDestinationData) missingFields.push('destination city/state');
      if (!equipmentCode) missingFields.push('equipmentCode/equipment_code');
      warn('⚠️ Missing required fields in payload:', missingFields);
    } else {
      log(`✅ Lane ${laneId || 'new'} validation passed (${destinationCity && destinationState ? 'complete dest' : 'partial dest'})`);
    }
  }

  try {
    // Prepare to send API request
    
    // Extra debugging for token issues
    log(`🔑 Auth token check for API call:`, {
      hasAuthSession: !!authSession,
      hasAccessToken: !!authSession?.access_token,
      tokenStart: authSession?.access_token ? authSession.access_token.substring(0, 10) + '...' : 'none'
    });
    
    // We need to get the current authentication token if none was passed
    let accessToken = authSession?.access_token;
    
    if (!accessToken) {
      try {
        // Import the auth utilities dynamically to avoid circular dependencies
        const { getCurrentToken } = await import('./authUtils');
        const tokenResult = await getCurrentToken();
        accessToken = tokenResult.token;
        
        log('🔒 Retrieved token from getCurrentToken:', {
          success: !!accessToken,
          tokenStart: accessToken ? accessToken.substring(0, 10) + '...' : 'none'
        });
      } catch (tokenError) {
        errLog('❌ Failed to retrieve auth token:', tokenError);
      }
    }
    // Timeout / abort controller
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": accessToken ? `Bearer ${accessToken}` : ''
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      try {
        const errorData = await response.json();
        // Add status code to the error response for consistent handling
        errorData.status = response.status;
        errorData.statusCode = response.status;
        if (response.status === 422 && debug) {
          warn('⚠️ Diversity / business rule failure', errorData);
        }
        return errorData; // Return the error response with status code
      } catch (jsonError) {
        // If JSON parsing fails, get the text and create an error object
        const errorText = await response.text();
        return {
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
    // Debug stats for new strict response shape
    if (debug && typeof window !== 'undefined') {
      log('🔢 Intelligence API stats:', {
        totalCityPairs: jsonData.totalCityPairs,
        uniqueOriginKmas: jsonData.uniqueOriginKmas,
        uniqueDestKmas: jsonData.uniqueDestKmas,
        pairCount: Array.isArray(jsonData.pairs) ? jsonData.pairs.length : 0
      });
    }
    return jsonData;
  } catch (error) {
    const isAbort = error?.name === 'AbortError';
    const out = {
      error: isAbort ? 'REQUEST_TIMEOUT' : (error.message || 'UNKNOWN_ERROR'),
      timeout: isAbort,
      status: isAbort ? 408 : 500,
      statusCode: isAbort ? 408 : 500
    };
    errLog('Intelligence API error:', out, error);
    return out;
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