# Intelligence Pairing API Testing Guide

This document provides instructions on how to test the intelligence pairing API's improved validation and fallback mechanisms.

## Testing the Intelligence Pairing API

The API has been refactored to make the system more robust and less reliant on emergency fallback data. The following test cases are designed to verify the functionality.

### Running the Test Script

A test script has been created to automate testing of the intelligence-pairing endpoint:

```bash
# Start the Next.js development server in one terminal
npm run dev

# In another terminal, run the test script
node test-intelligence-pairing.js
```

### Test Cases

The script tests the following scenarios:

1. **Normal Operation**
   - Uses Chicago, IL to Atlanta, GA
   - Expected result: Uses real data from the database
   - Metadata should show `dataSourceType: "database"`

2. **Force Emergency Mode**
   - Explicitly requests emergency mode via query parameter
   - Expected result: Uses emergency fallback data
   - Metadata should show `dataSourceType: "emergency"`
   - Metadata should include `fallbackReason: "forced"`

3. **Edge Case - Small Cities**
   - Uses smaller cities (Peoria, IL to Macon, GA)
   - Expected result: May use real data or fallback depending on database content
   - If fallback occurs, metadata should explain why

### Manual Testing

You can also manually test using API requests:

#### 1. Normal operation

```http
POST /api/intelligence-pairing
{
  "origin_city": "Chicago",
  "origin_state": "IL",
  "dest_city": "Atlanta",
  "dest_state": "GA"
}
```

#### 2. Force emergency mode

```http
POST /api/intelligence-pairing?force_emergency=true
{
  "origin_city": "Chicago", 
  "origin_state": "IL",
  "dest_city": "Atlanta",
  "dest_state": "GA"
}
```

#### 3. Test recovery

To test recovery mechanisms, you could temporarily modify the database query to limit results:

```javascript
// In intelligence-pairing.js, modify the query to use LIMIT
.limit(3) // This will limit results and likely trigger recovery
```

## Verification Checklist

✅ API should not use emergency fallback unnecessarily  
✅ Validation should check for KMA diversity (minimum 6 unique KMAs)  
✅ Recovery should be attempted before falling back to emergency data  
✅ Metadata should include detailed information about data source and fallback reasons  
✅ Emergency fallback should produce diverse city pairs when needed

## Expected Metadata Format

```json
{
  "metadata": {
    "dataSourceType": "database|recovery|emergency",
    "fallbackReason": "insufficient_kmas|no_data|corrupted_data|forced|null",
    "uniqueOriginKmas": 8,
    "uniqueDestKmas": 7,
    "totalCityPairs": 22,
    "recoveryAttempted": true|false
  }
}
```

This metadata helps diagnose any issues with the intelligence pairing system and provides transparency about why certain data sources are being used.
