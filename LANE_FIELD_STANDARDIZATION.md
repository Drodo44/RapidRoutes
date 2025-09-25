# Lane API Destination Field Standardization

## Overview

This update enhances the `/api/lanes` endpoint to properly standardize destination fields across various naming conventions. The changes ensure that regardless of whether destination fields come in as `dest_city`/`dest_state`, `destCity`/`destState`, or `destination_city`/`destination_state`, they are always stored in the database using the canonical `destination_city`/`destination_state` field names.

## Changes Made

### POST Handler

1. **Enhanced Field Extraction**
   - Now extracts all possible destination field variants: `dest_*`, `dest*`, and `destination_*`
   - Maps all variants to canonical `destination_city`/`destination_state` fields
   - Removes all non-standard field variants from the final payload

2. **Expanded Validation**
   - Validation now checks across all possible field name variants
   - Detailed error response includes status of all field variants for better debugging
   - Only canonical fields are stored in the database

3. **Improved Logging**
   - Added detailed logging of the field mapping process
   - Logs both original incoming fields and final mapped fields
   - Helps with debugging field mapping issues

### PUT/PATCH Handler

1. **Standardized Field Mapping**
   - Similar extraction of all destination field variants
   - Consistent mapping to canonical `destination_city`/`destination_state` fields
   - Clean updates object with only standardized fields

2. **Enhanced Error Handling**
   - More detailed logging of the update process
   - Logs both original and mapped fields

### Code Cleanup

- Removed unreachable code in the POST handler
- Standardized error handling
- Improved documentation

## Test Case

A test file has been created at `/tests/lane-dest-fields.test.js` to verify the destination field mapping functionality. It includes the following test cases:

1. Standard `destination_*` fields
2. Legacy `dest_*` fields
3. Mixed field formats
4. Partial destination (city only)
5. Partial destination (state only)

## Validation Rules

The API now accepts lanes with:

- Required fields: `origin_city`, `origin_state`, `equipment_code`, and `pickup_earliest`
- At least ONE destination field: any variant of city OR state

## Affected Files

- `/pages/api/lanes.js`
- `/tests/lane-dest-fields.test.js` (new)
