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
 * @returns {Promise<Object>} - Response from intelligence-pairing API
 */
export async function callIntelligencePairingApi(lane, options = {}) {
  // Determine if we should use test mode
  const useTestMode = options.useTestMode !== undefined 
    ? options.useTestMode 
    : isTestModeAllowed();
  
  // First gather parameters in camelCase format and ensure defaults for critical fields
  const camelCasePayload = {
    laneId: lane.id,
    originCity: lane.origin_city || lane.originCity || '',
    originState: lane.origin_state || lane.originState || '',
    originZip: lane.origin_zip || lane.originZip || '',
    // Use destinationCity/destinationState to match backend validation
    destinationCity: lane.destination_city || lane.destinationCity || '',
    destinationState: lane.destination_state || lane.destinationState || '',
    destinationZip: lane.destination_zip || lane.destinationZip || '',
    // Make sure equipment_code is NEVER empty - default to 'V' (Van)
    equipmentCode: lane.equipment_code || lane.equipmentCode || 'V',
    test_mode: useTestMode
  };
  
  // Debug log for initial values
  console.log('🔎 Raw lane data received:', {
    id: lane.id,
    origin_city: lane.origin_city,
    originCity: lane.originCity,
    origin_state: lane.origin_state,
    originState: lane.originState,
    equipment_code: lane.equipment_code,
    equipmentCode: lane.equipmentCode
  });
  
  // Helper function to convert camelCase keys to snake_case
  const toSnakeCase = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  
  // Convert all keys to snake_case for the backend
  const payload = Object.entries(camelCasePayload).reduce((acc, [key, value]) => {
    // test_mode is already snake_case
    const snakeKey = key === 'test_mode' ? key : toSnakeCase(key);
    acc[snakeKey] = value;
    return acc;
  }, {});
  
  // Validate required fields are present and non-null
  const requiredFields = ['origin_city', 'origin_state', 'destination_city', 'destination_state', 'equipment_code'];
  const missingFields = requiredFields.filter(field => !payload[field] || payload[field] === '');
  
  if (missingFields.length > 0) {
    console.warn('🚨 WARNING: Missing required fields in payload:', missingFields);
    console.warn('Current payload:', payload);
  }
  
  console.log('🔍 Intelligence API call with transformed payload:', payload);

  try {
    // For debugging/logging - show the final payload that will be sent
    console.log('🟡 Final payload being sent to API:');
    console.log(JSON.stringify(payload, null, 2));
    
    // Additional debug info to help compare with working curl example
    console.log('📋 Required fields status:');
    console.log({
      origin_city: !!payload.origin_city ? '✅' : '❌',
      origin_state: !!payload.origin_state ? '✅' : '❌',
      destination_city: !!payload.destination_city ? '✅' : '❌',
      destination_state: !!payload.destination_state ? '✅' : '❌',
      equipment_code: !!payload.equipment_code ? '✅' : '❌',
      origin_zip: payload.origin_zip || '(optional)',
      destination_zip: payload.destination_zip || '(optional)',
      lane_id: payload.lane_id || '(optional)'
    });
    
    // Get the user's session token for authorization
    const token = localStorage.getItem('supabase.auth.token');
    
    const response = await fetch('/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`🔴 API error (${response.status}):`, errorText);
      console.error(`🔴 Failed payload:`, JSON.stringify(payload, null, 2));
      throw new Error(`API responded with status: ${response.status} - ${errorText}`);
    }

    return await response.json();
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