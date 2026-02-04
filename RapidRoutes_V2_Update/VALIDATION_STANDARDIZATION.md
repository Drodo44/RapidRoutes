# Lane Validation Standardization

## Overview

This update standardizes the lane validation logic across all three key components of the RapidRoutes system:

1. `pages/post-options.js` (Frontend validation)
2. `pages/api/intelligence-pairing.js` (API validation)
3. `utils/intelligenceApiAdapter.js` (Adapter validation)

## Standardized Validation Logic

The validation logic has been unified to ensure consistent behavior and error reporting across the entire application. The standardized validation follows these steps:

### 1. Field Normalization

Each component now normalizes field names in exactly the same way:

```javascript
const originCity = lane.originCity || lane.origin_city;
const originState = lane.originState || lane.origin_state;
const destinationCity = lane.destinationCity || lane.destination_city || lane.dest_city;
const destinationState = lane.destinationState || lane.destination_state || lane.dest_state;
const equipmentCode = lane.equipmentCode || lane.equipment_code;
```

This ensures that regardless of whether fields are provided in camelCase, snake_case, or using legacy `dest_*` prefixes, they will be properly recognized.

### 2. Destination Data Check

All components use the same logic to determine if sufficient destination data is provided:

```javascript
const hasDestinationData = destinationCity || destinationState;
```

This allows lanes to pass validation if they have EITHER `destinationCity` OR `destinationState` (not requiring both).

### 3. Final Validation

The final validation check is now consistent across all components:

```javascript
if (!originCity || !originState || !equipmentCode || !hasDestinationData) {
  console.error(`❌ Lane ${lane.id || lane.lane_id || 'new'} invalid:`, {
    originCity: !!originCity,
    originState: !!originState,
    destinationCity: !!destinationCity,
    destinationState: !!destinationState,
    hasDestinationData,
    equipmentCode: !!equipmentCode
  });
  // Component-specific error handling...
  return false;
}
return true;
```

This ensures that all components require:

- Origin City
- Origin State
- Equipment Code
- At least ONE of Destination City OR Destination State

### 4. Consistent Logging

All three components now use identical logging formats:

- Error format: `❌ Lane ${id} invalid: {...}`
- Success format: `✅ Lane ${id} validation passed - proceeding with ${type} destination data`

## Benefits

1. **Consistency**: Identical validation logic across all system components
2. **Flexibility**: Supports partial destination data (either city OR state)
3. **Robustness**: Handles multiple field naming conventions (camelCase, snake_case, dest_*)
4. **Debuggability**: Standardized error logging format for easier troubleshooting
5. **Maintainability**: Unified validation approach makes future updates simpler

## Files Updated

- `/workspaces/RapidRoutes/pages/post-options.js`
- `/workspaces/RapidRoutes/pages/api/intelligence-pairing.js`
- `/workspaces/RapidRoutes/utils/intelligenceApiAdapter.js`