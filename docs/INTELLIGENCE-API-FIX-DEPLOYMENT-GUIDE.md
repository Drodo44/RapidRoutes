# Intelligence API Fix Deployment Guide

This guide outlines the steps to deploy the fix for the 400 Bad Request errors occurring with the intelligence-pairing API.

## Overview

We've identified that the root cause of the 400 Bad Request errors is a parameter name mismatch between what the frontend sends (`destinationCity`/`destinationState`) and what the geographic crawl function expects (`destCity`/`destState`). 

Our solution uses an adapter pattern to fix the issue without modifying protected files.

## Deployment Steps

### 1. Create the API Adapter

Create a new file at `/utils/intelligenceApiAdapter.js`:

```javascript
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
 * @returns {Promise<Object>} - Response from intelligence-pairing API
 */
export async function callIntelligencePairingApi(lane) {
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
    test_mode: process.env.NODE_ENV === 'development'
  };

  console.log('Intelligence API call with payload:', payload);

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
```

### 2. Update Frontend Code

Locate all files that make calls to the intelligence-pairing API and update them to use the adapter.

#### In `pages/post-options.js`:

Find code that looks like this:

```javascript
const generatePairs = async () => {
  setIsLoading(true);
  
  try {
    const response = await fetch('/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        laneId: lane.id,
        originCity: lane.origin_city || lane.originCity,
        originState: lane.origin_state || lane.originState,
        originZip: lane.origin_zip || lane.originZip || '',
        destinationCity: lane.dest_city || lane.destination_city || lane.destinationCity,
        destinationState: lane.dest_state || lane.destination_state || lane.destinationState,
        destinationZip: lane.dest_zip || lane.destination_zip || lane.destinationZip || '',
        equipmentCode: lane.equipment_code || lane.equipmentCode || 'V'
      }),
    });
    
    // Handle response...
  } catch (error) {
    // Handle error...
  } finally {
    setIsLoading(false);
  }
};
```

Replace with:

```javascript
import { callIntelligencePairingApi } from '../utils/intelligenceApiAdapter';

const generatePairs = async () => {
  setIsLoading(true);
  
  try {
    const result = await callIntelligencePairingApi(lane);
    
    // Handle response same as before...
  } catch (error) {
    // Handle error...
  } finally {
    setIsLoading(false);
  }
};
```

### 3. Deploy Debug Page (Optional)

Optionally, you can deploy the debug page at `pages/debug-api.js` to help with testing and troubleshooting.

### 4. Test in Development

Before deploying to production:

1. Test the changes in the development environment
2. Verify that the intelligence pairing API no longer returns 400 errors
3. Confirm that the API returns proper pairs for various lane configurations

### 5. Deploy to Production

Once testing is complete:

1. Create a pull request with the changes
2. Have the changes reviewed
3. Merge to the main branch
4. Deploy to production

### 6. Post-Deployment Verification

After deploying to production:

1. Test the intelligence pairing functionality in production
2. Monitor error logs for any 400 Bad Request errors
3. Verify that pairs are being generated correctly

## Rollback Plan

If issues arise after deployment:

1. Revert the changes that added the adapter
2. Restore the original direct API calls
3. Deploy the reverted changes
4. Continue debugging to find an alternative solution

## Future Considerations

If the protected file restriction is lifted in the future, the optimal solution would be to update the API handler itself to correctly transform the parameter names before calling `generateGeographicCrawlPairs`:

```javascript
// In pages/api/intelligence-pairing.js
const crawlParams = {
  originCity: normalizedFields.origin_city,
  originState: normalizedFields.origin_state,
  destCity: normalizedFields.destination_city, // Properly named for the function
  destState: normalizedFields.destination_state, // Properly named for the function
  equipmentCode: normalizedFields.equipment_code
};
const result = await generateGeographicCrawlPairs(crawlParams, adminSupabase);
```