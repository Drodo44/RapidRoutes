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
  
  console.log(`🔄 Normalized camelCase payload for lane ${lane.id}:`, camelCasePayload);
  
  // Convert raw data to proper format
  
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
  // Updated validation: requires origin fields + equipment, allows EITHER destination_city OR destination_state
  const hasDestinationData = payload.destination_city || payload.destination_state;
  
  if (!payload.origin_city || !payload.origin_state || !hasDestinationData || !payload.equipment_code) {
    console.error("❌ Lane invalid:", { 
      lane_id: payload.lane_id, 
      origin_city: !!payload.origin_city, 
      origin_state: !!payload.origin_state, 
      destination_city: !!payload.destination_city, 
      destination_state: !!payload.destination_state, 
      has_destination_data: !!hasDestinationData, 
      equipment_code: !!payload.equipment_code 
    });
    
    const missingFields = [];
    if (!payload.origin_city) missingFields.push('origin_city');
    if (!payload.origin_state) missingFields.push('origin_state');
    if (!hasDestinationData) missingFields.push('destination data (either city or state)');
    if (!payload.equipment_code) missingFields.push('equipment_code');
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Missing required fields in payload:', missingFields);
      console.warn('⚠️ Lane will likely fail validation in API');
    }
  } else {
    // Log successful validation
    console.log(`✅ Lane ${payload.lane_id || 'new'} passed adapter validation with ${hasDestinationData ? (payload.destination_city && payload.destination_state ? 'complete' : 'partial') : 'no'} destination data`);
  }

  try {
    // Prepare to send API request
    
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