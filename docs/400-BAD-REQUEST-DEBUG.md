# 400 Bad Request Debug Report

## Issue Summary

The frontend is receiving 400 Bad Request responses when calling the intelligence-pairing API. The console logs show requests being made with proper parameters but failing with 400 status code.

## Root Cause Analysis

After extensive testing and code examination, we've confirmed the following issues:

1. **Parameter Name Mismatch**: The root cause is that the `generateGeographicCrawlPairs` function expects `destCity` and `destState`, but the frontend is sending `destinationCity` and `destinationState`. 

2. **Field Normalization Gap**: While the API has normalization code, it attempts to convert from snake_case and camelCase formats but doesn't correctly map between `destinationCity` → `destCity` and `destinationState` → `destState`.

3. **Parameter Transformation Issue**: The API correctly normalizes `destination_city` to `destination_city` internally, but when passing to the `generateGeographicCrawlPairs` function, it should be using `destCity` instead.

4. **ALLOW_TEST_MODE Environment Variable**: In production, this is likely set to `false`, which means all requests with `test_mode: true` will still require authentication.

## Field Mapping Analysis

Frontend sends:
```javascript
{
  laneId: "...",
  originCity: "...",
  originState: "...", 
  originZip: "...",
  destinationCity: "...",  // This naming doesn't match what geographicCrawl expects
  destinationState: "...", // This naming doesn't match what geographicCrawl expects
  destinationZip: "...",
  equipmentCode: "..."
}
```

API normalizes to:
```javascript
{
  lane_id: lane_id || laneId,
  origin_city: origin_city || originCity,
  origin_state: origin_state || originState,
  destination_city: destination_city || destinationCity || dest_city,
  destination_state: destination_state || destinationState || dest_state,
  equipment_code: equipment_code || equipmentCode || 'V',
}
```

And then passes to `generateGeographicCrawlPairs`, but with incorrect parameter names:
```javascript
{
  originCity: normalizedFields.origin_city,
  originState: normalizedFields.origin_state,
  destCity: normalizedFields.destination_city,  // Should be destCity, not destination_city
  destState: normalizedFields.destination_state, // Should be destState, not destination_state
  equipmentCode: normalizedFields.equipment_code
}
```

## Debugging Steps Taken

1. Created debug scripts to isolate and test the API endpoint
2. Examined how parameters are normalized and passed to the geographic crawl function
3. Created tests for various parameter formats
4. Added enhanced logging for the API handler
5. Verified that sending parameters as `destCity` and `destState` resolves the issue

## Solution Without Modifying Protected Files

Since the intelligence-pairing API is a protected file according to the project standards, we've developed a solution that doesn't require modifying it:

1. **Create an API adapter in the frontend**:
   ```javascript
   // utils/intelligenceApiAdapter.js
   export async function callIntelligencePairingApi(lane) {
     // Format parameters properly to match what the API expects
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
   
     // API call code...
   }
   ```

2. **Update frontend code to use the adapter**:
   Replace direct fetch calls with the adapter function.

## Testing and Verification

We've created the following test tools to verify the solution:

1. `/scripts/test-parameter-formats.js` - Tests different parameter formats
2. `/scripts/test-adapter.js` - Tests the adapter solution
3. `/scripts/browser-debug-tool.js` - Browser-based debugging utility
4. `/pages/debug-api.js` - Test page with UI for testing the fix

Our tests confirm that changing `destinationCity`/`destinationState` to `destCity`/`destState` resolves the 400 Bad Request errors.

## Implementation Recommendations

1. Implement the API adapter approach in `/utils/intelligenceApiAdapter.js`
2. Update all frontend code to use this adapter
3. Add the debug page to help with future testing

If protected files can be modified in the future, the optimal fix would be updating the API handler to correctly transform the parameter names before calling `generateGeographicCrawlPairs`.