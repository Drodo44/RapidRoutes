/**
 * This script modifies the intelligenceApiAdapter.js file to add extensive debugging
 * so we can see exactly what's going on with the API calls. This is a temporary
 * diagnostic tool, not meant for production.
 */

import fs from 'fs';
import path from 'path';

// Path to the adapter file
const adapterPath = path.resolve('./utils/intelligenceApiAdapter.js');

// Read the current adapter file
console.log('Reading adapter file...');
const currentContent = fs.readFileSync(adapterPath, 'utf8');

// Enhanced debugging version of the adapter
const enhancedAdapter = `/**
 * Intelligence API Adapter - ENHANCED DEBUG VERSION
 * 
 * This is a temporary debug version with extensive logging
 * to help diagnose the exact API requirements.
 */

/**
 * Call the intelligence-pairing API with properly formatted parameters
 * to avoid 400 Bad Request errors
 * 
 * @param {Object} lane - Lane object with origin/destination information
 * @param {Object} options - Additional options for the API call
 * @param {boolean} options.useTestMode - Whether to use test mode
 * @returns {Promise<Object>} - Response from intelligence-pairing API
 */
export async function callIntelligencePairingApi(lane, options = {}) {
  console.log('🔍 DEBUG: callIntelligencePairingApi called with lane:', JSON.stringify(lane, null, 2));
  console.log('Options:', JSON.stringify(options, null, 2));
  
  // Determine if we should use test mode
  const useTestMode = options.useTestMode !== undefined 
    ? options.useTestMode 
    : isTestModeAllowed();
  
  console.log('Test mode setting:', useTestMode);
  
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
  
  console.log('🧩 Initial camelCase payload:', JSON.stringify(camelCasePayload, null, 2));
  
  // Check for any null/undefined values
  Object.entries(camelCasePayload).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      console.warn(\`⚠️ WARNING: \${key} is \${value}\`);
    }
  });
  
  // Helper function to convert camelCase keys to snake_case
  const toSnakeCase = (str) => str.replace(/[A-Z]/g, letter => \`_\${letter.toLowerCase()}\`);
  
  // Convert all keys to snake_case for the backend
  const payload = Object.entries(camelCasePayload).reduce((acc, [key, value]) => {
    // test_mode is already snake_case
    const snakeKey = key === 'test_mode' ? key : toSnakeCase(key);
    acc[snakeKey] = value;
    return acc;
  }, {});
  
  // Check for specific required fields
  const requiredFields = ['origin_city', 'origin_state', 'dest_city', 'dest_state', 'equipment_code'];
  const missingFields = requiredFields.filter(field => {
    const isEmpty = !payload[field] || payload[field] === '';
    if (isEmpty) {
      console.error(\`❌ MISSING REQUIRED FIELD: \${field}\`);
    }
    return isEmpty;
  });
  
  if (missingFields.length > 0) {
    console.error('🚨 CRITICAL ERROR: Missing required fields:', missingFields.join(', '));
  }
  
  console.log('🟡 Final payload being sent to API:');
  console.log(JSON.stringify(payload, null, 2));
  
  console.log('📋 Required fields check:');
  requiredFields.forEach(field => {
    console.log(\`\${field}: \${payload[field] ? '✅' : '❌'}\`);
  });

  try {
    console.log('📡 Sending request to API...');
    
    const response = await fetch('/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log(\`📥 Response status: \${response.status}\`);
    
    if (!response.ok) {
      let errorText;
      try {
        const errorJson = await response.json();
        errorText = JSON.stringify(errorJson);
        console.error('🔴 API error response (JSON):', errorJson);
      } catch {
        errorText = await response.text();
        console.error(\`🔴 API error response (text): \${errorText}\`);
      }
      
      console.error('🔴 Failed payload:', JSON.stringify(payload, null, 2));
      throw new Error(\`API responded with status: \${response.status} - \${errorText}\`);
    }

    const responseData = await response.json();
    console.log('✅ API Success! Response:', JSON.stringify(responseData, null, 2));
    return responseData;
  } catch (error) {
    console.error('❌ Intelligence API error:', error);
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
  const allowTestMode = process.env.NEXT_PUBLIC_ALLOW_TEST_MODE === 'true' || 
                        process.env.NODE_ENV === 'development';
  console.log('isTestModeAllowed() => ', allowTestMode);
  return allowTestMode;
}
`;

// Create a backup of the original file
const backupPath = `${adapterPath}.backup`;
console.log(`Creating backup of original adapter at ${backupPath}`);
fs.writeFileSync(backupPath, currentContent);

// Write the enhanced debug adapter
console.log('Writing enhanced debug adapter...');
fs.writeFileSync(adapterPath, enhancedAdapter);

console.log('\n✅ Debug adapter installed successfully!');
console.log('Instructions:');
console.log('1. Refresh the application');
console.log('2. Open developer console (F12)');
console.log('3. Try generating pairings');
console.log('4. Look for the "🟡 Final payload being sent to API:" log');
console.log('5. Compare with the working curl payload');
console.log('\nTo restore the original adapter:');
console.log(`cp ${backupPath} ${adapterPath}`);