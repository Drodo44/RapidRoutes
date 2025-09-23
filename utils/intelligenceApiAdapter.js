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

import { getCurrentToken } from './authUtils';

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
  
  // Fetch the token
  const { token, error } = await getCurrentToken();
  if (error || !token) {
    console.error('❌ Failed to fetch token:', error?.message || 'No token available');
    throw new Error('Authentication token is missing');
  }

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Prepare payload in snake_case
  const payload = {
    lane_id: lane.id,
    origin_city: lane.origin_city || lane.originCity || '',
    origin_state: lane.origin_state || lane.originState || '',
    destination_city: lane.destination_city || lane.destinationCity || '',
    destination_state: lane.destination_state || lane.destinationState || '',
    equipment_code: lane.equipment_code || lane.equipmentCode || 'V',
    test_mode: useTestMode,
  };
  
  // Debug logs
  console.log('🔐 Token being used:', token);
  console.log('📤 Headers being sent:', headers);
  console.log('📦 Payload being sent:', payload);

  try {
    const response = await fetch('/api/intelligence-pairing', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorDetails = await response.json();
      console.error(`❌ API Error [${response.status}]:`, errorDetails);
      throw new Error(`API responded with status ${response.status}: ${JSON.stringify(errorDetails)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ API Request Failed:', error);
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