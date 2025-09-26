# Pairing Logic Recipe

## Overview

The pairing system is designed to generate high-quality origin-destination city pairs for freight routes. It leverages data from Supabase and HERE.com to ensure the generated pairs meet strict business requirements, including geographic proximity, KMA diversity, and data completeness. The system is optimized for reliability and accuracy, ensuring brokers have actionable data for freight operations.

## Pairing Criteria

The following criteria are used to generate city pairings:

1. **Radius Limit**:
   - Cities must be within a 100-mile radius of the specified origin and destination coordinates.
   - This radius is fixed and must not be expanded under any circumstances.

2. **KMA Constraints**:
   - Each pairing must include cities with valid Key Market Area (KMA) codes.
   - A minimum of 6 unique KMAs is required for both origin and destination cities.

3. **Uniqueness**:
   - Each city pair must be unique.
   - Duplicate or redundant pairings are not allowed.

4. **Data Completeness**:
   - Each city in the pair must have complete data, including city name, state, ZIP code, latitude, longitude, and KMA code.
   - Pairs with incomplete data are invalid and must not be included in the results.

## Valid Conditions for Emergency Fallback

Emergency fallback is only triggered under the following conditions:

1. **Force Emergency Mode**:
   - The `forceEmergencyMode` flag is explicitly set to `true` via the query parameter.

2. **API Error**:
   - Supabase or HERE.com returns an actual error, such as a timeout, exception, or HTTP status code 500 or higher.

## Handling 0 Results

If the API returns 0 results:

- **Do NOT trigger fallback**:
  - This is considered a logic bug, not a fallback case.
- **Log the failure**:
  - Log detailed information about the failure for debugging purposes.
- **Throw an error**:
  - The system must throw an error to indicate the failure.

## What MUST NOT Be Changed

1. The 100-mile radius limit must remain fixed.
2. Emergency fallback must only be triggered under the valid conditions listed above.
3. The minimum requirement of 6 unique KMAs for both origin and destination cities must not be relaxed.
4. The system must not silently recover or fallback when 0 results are returned.
5. The pairing logic must always prioritize data completeness and uniqueness.

## Verification Checklist

- [ ] The system generates city pairs only within a 100-mile radius.
- [ ] Each pairing includes at least 6 unique KMAs for both origin and destination cities.
- [ ] Emergency fallback is only triggered by the `forceEmergencyMode` flag or an actual API error.
- [ ] The system throws an error if 0 results are returned.
- [ ] All city pairs have complete data (city, state, ZIP, latitude, longitude, KMA code).
- [ ] No duplicate or redundant city pairs are included in the results.
- [ ] The system logs detailed information for any failures or errors.
