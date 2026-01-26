# API Validation Update for Partial Destination Data

## Changes Implemented

We've updated the validation logic in two key API endpoints to allow partial destination data (either city OR state), instead of requiring both. This aligns the backend validation with the frontend validation logic that was previously updated.

### 1. Updated `/api/lanes.js` Validation

```javascript
// OLD validation (required both dest_city and dest_state)
if (!payload.origin_city || !payload.origin_state || !payload.dest_city || !payload.dest_state || 
    !payload.equipment_code || !payload.pickup_earliest) {
  return res.status(400).json({ error: 'Missing required fields' });
}

// NEW validation (allows either dest_city OR dest_state)
const hasDestinationData = payload.dest_city || payload.dest_state;
if (!payload.origin_city || !payload.origin_state || !hasDestinationData || 
    !payload.equipment_code || !payload.pickup_earliest) {
  return res.status(400).json({ 
    error: 'Missing required fields',
    details: {
      has_origin: !!payload.origin_city && !!payload.origin_state,
      has_destination: !!hasDestinationData,
      has_equipment: !!payload.equipment_code,
      has_pickup_date: !!payload.pickup_earliest
    }
  });
}
```

### 2. Updated `/api/intelligence-pairing.js` Validation

```javascript
// OLD validation (required both destination_city and destination_state)
if (!normalizedFields.origin_city || !normalizedFields.origin_state || 
    !normalizedFields.destination_city || !normalizedFields.destination_state) {
  return res.status(400).json({
    error: 'Missing required fields',
    details: { 
      origin_city: normalizedFields.origin_city, 
      origin_state: normalizedFields.origin_state,
      destination_city: normalizedFields.destination_city,
      destination_state: normalizedFields.destination_state 
    },
    status: 400,
    success: false
  });
}

// NEW validation (allows either destination_city OR destination_state)
const hasDestinationData = normalizedFields.destination_city || normalizedFields.destination_state;
if (!normalizedFields.origin_city || !normalizedFields.origin_state || !hasDestinationData) {
  return res.status(400).json({
    error: 'Missing required fields',
    details: { 
      origin_city: normalizedFields.origin_city, 
      origin_state: normalizedFields.origin_state,
      has_destination_data: !!hasDestinationData,
      destination_city: normalizedFields.destination_city,
      destination_state: normalizedFields.destination_state,
      equipment_code: normalizedFields.equipment_code
    },
    status: 400,
    success: false
  });
}
```

## Enhanced Error Responses

Both API endpoints now provide more detailed error information to help diagnose validation failures. The error responses now include:

1. Field diagnostics showing which required fields are missing
2. Boolean flags indicating whether required data blocks are present
3. The actual field values to help with debugging

## Testing Verification

To verify these changes:

1. Create a lane with complete origin data (city and state)
2. Create a lane with only destination city (no destination state)
3. Create a lane with only destination state (no destination city)
4. Attempt to generate pairings for each lane

All lanes with at least partial destination data should now successfully process and generate pairings.

## Implementation Notes

- This change aligns the backend validation with the frontend validation logic
- Both snake_case (API preferred) and camelCase (frontend preferred) field names are supported
- The detailed error responses make debugging validation failures much easier
- This maintains the requirement for complete origin data (both city AND state) while relaxing the destination requirement

## Next Steps

- Monitor API logs for any validation failures
- Verify that lanes with partial destination data are properly processed by the intelligence system
- Consider adding automated tests specifically for partial destination data scenarios
