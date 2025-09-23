/**
 * Intelligence API Adapter
 * 
 * This adapter ensures that requests to the intelligence-pairing API
 * are formatted correctly to avoid 400 Bad Request errors.
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
  
  // First gather parameters in camelCase format
  const camelCasePayload = {
    laneId: lane.id,
    originCity: lane.origin_city || lane.originCity,
    originState: lane.origin_state || lane.originState,
    originZip: lane.origin_zip || lane.originZip || '',
    // Use destCity/destState instead of destinationCity/destinationState
    destCity: lane.dest_city || lane.destination_city || lane.destinationCity,
    destState: lane.dest_state || lane.destination_state || lane.destinationState,
    destZip: lane.dest_zip || lane.destination_zip || lane.destinationZip || '',
    equipmentCode: lane.equipment_code || lane.equipmentCode || 'V',
    test_mode: useTestMode
  };
  
  // Helper function to convert camelCase keys to snake_case
  const toSnakeCase = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  
  // Convert all keys to snake_case for the backend
  const payload = Object.entries(camelCasePayload).reduce((acc, [key, value]) => {
    // test_mode is already snake_case
    const snakeKey = key === 'test_mode' ? key : toSnakeCase(key);
    acc[snakeKey] = value;
    return acc;
  }, {});
  
  console.log('Intelligence API call with transformed payload:', payload);

  console.log('Intelligence API call with transformed payload:', payload);

  try {
    // For debugging/logging - show the final payload that will be sent
    console.log('Final snake_case payload to API:', JSON.stringify(payload, null, 2));
    
    const response = await fetch('/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      throw new Error(`API responded with status: ${response.status}`);
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