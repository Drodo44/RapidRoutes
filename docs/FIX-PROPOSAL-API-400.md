# Fix Proposal for 400 Bad Request Issue

## Solution Without Modifying Protected Files

Based on our investigation, we've identified that the issue is likely caused by a parameter name mismatch between the API handler and the geographicCrawl function. Since we can't modify the protected files, we need a solution that works with the existing code.

## Frontend Adapter Approach

We can create an adapter on the frontend side that properly formats requests before sending them to the API:

```javascript
/**
 * Intelligence API Adapter
 * 
 * This adapter ensures that requests to the intelligence-pairing API
 * are formatted correctly to avoid 400 Bad Request errors.
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

  try {
    const response = await fetch('/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Intelligence API error:', error);
    throw error;
  }
}
```

## Implementation Plan

1. Add this adapter file to `utils/intelligenceApiAdapter.js`
2. Update the frontend code to use this adapter instead of direct fetch calls
3. No changes required to protected backend files

## Example Usage in Frontend

Update `pages/post-options.js` to use the adapter:

```javascript
import { callIntelligencePairingApi } from '../utils/intelligenceApiAdapter';

// Replace existing fetch call with adapter call
const handleGeneratePairs = async () => {
  setIsLoading(true);
  try {
    const result = await callIntelligencePairingApi(selectedLane);
    if (result && result.pairs) {
      setPairs(result.pairs);
    }
  } catch (error) {
    console.error('Failed to generate pairs:', error);
    // Display error to user
  } finally {
    setIsLoading(false);
  }
};
```

## Advantages of This Approach

1. No changes to protected backend files
2. Single point of maintenance for API calls
3. Can handle the parameter format conversion consistently
4. Easy to update if the API requirements change in the future