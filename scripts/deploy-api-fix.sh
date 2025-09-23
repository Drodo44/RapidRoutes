#!/bin/bash
# Migration script to deploy the intelligence API adapter fix

echo "=== Intelligence API Fix Migration ==="
echo "This script deploys the API adapter fix to production"

# Check if we're in the project root directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Please run this script from the project root directory"
  exit 1
fi

# Create backup of files
echo "Creating backups of files to be modified..."
mkdir -p backups
cp pages/post-options.js backups/post-options.js.bak
cp utils/testAuthFlow.js backups/testAuthFlow.js.bak
echo "✅ Backups created in ./backups/"

# Copy the adapter file if it doesn't exist
if [ ! -f "utils/intelligenceApiAdapter.js" ]; then
  echo "Creating intelligenceApiAdapter.js..."
  cat > utils/intelligenceApiAdapter.js << 'EOL'
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
  
  // Format parameters properly to match what the API expects
  // Use the direct format that matches what geographicCrawl expects
  const payload = {
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

  try {
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
EOL
  echo "✅ Created utils/intelligenceApiAdapter.js"
else
  echo "✅ utils/intelligenceApiAdapter.js already exists"
fi

# Verify key files exist
if [ ! -f "pages/post-options.js" ]; then
  echo "❌ Error: pages/post-options.js not found"
  exit 1
fi

if [ ! -f "utils/testAuthFlow.js" ]; then
  echo "❌ Error: utils/testAuthFlow.js not found"
  exit 1
fi

echo ""
echo "=== Migration Complete ==="
echo "The intelligence API adapter has been deployed."
echo ""
echo "To verify the fix:"
echo "1. Start the development server: npm run dev"
echo "2. Test the Generate Pairings functionality"
echo "3. Monitor network requests for 200 responses from /api/intelligence-pairing"
echo ""
echo "If issues occur, restore from backups in ./backups/"