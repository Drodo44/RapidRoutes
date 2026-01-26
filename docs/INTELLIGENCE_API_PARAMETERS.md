# Intelligence API Parameters Fix

## Issue Resolution
We fixed the 400 Bad Request errors when calling the intelligence-pairing API by addressing parameter naming and casing mismatches.

## Root Cause
1. **Parameter Name Mismatch**: The frontend was using `dest_city` and `dest_state` but the API validation requires `destination_city` and `destination_state`
2. **Parameter Casing**: The frontend was using camelCase (`originCity`, `destCity`) but the backend expects snake_case (`origin_city`, `destination_city`)

## Required API Parameters
The intelligence-pairing API requires these parameters in snake_case format:

| Parameter | Description | Required |
|-----------|-------------|----------|
| `origin_city` | City of origin | Yes |
| `origin_state` | State of origin | Yes |
| `destination_city` | Destination city | Yes |
| `destination_state` | Destination state | Yes |
| `equipment_code` | Equipment code (e.g., "FD", "V") | Yes |
| `origin_zip` | ZIP code of origin | No |
| `destination_zip` | ZIP code of destination | No |
| `lane_id` | ID of the lane (for logging) | No |
| `test_mode` | Enable test mode | No |

## Implementation Notes
- Created a central `intelligenceApiAdapter.js` that handles parameter normalization
- Implemented field renaming (`dest_city` → `destination_city`)
- Converted all keys from camelCase to snake_case
- Added validation for required fields with detailed logging
- Added fallbacks for missing fields where appropriate

## Testing
To verify the fix:
1. Open browser developer console
2. Try generating pairings for a lane
3. Check the console for the payload log
4. Verify the API returns a 200 OK response

## Reference Implementation
```javascript
// Example payload transformation:
const payload = {
  origin_city: 'Pasco',
  origin_state: 'WA',
  destination_city: 'Vancouver',  // Note: uses destination_city not dest_city
  destination_state: 'WA',        // Note: uses destination_state not dest_state
  equipment_code: 'FD'
};
```

## Future Improvements
- Add schema validation for API payloads
- Create comprehensive test suite for API parameter handling
- Consider standardizing on snake_case or camelCase throughout the application