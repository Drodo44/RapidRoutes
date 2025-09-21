# RapidRoutes Intelligence API Verification Guide

## Overview

This document outlines the process for verifying the RapidRoutes intelligence-pairing API. For freight brokers using the system, proper API functionality is critical, ensuring that lane generation produces enough unique Key Market Areas (KMAs) for effective freight posting.

## Key Requirements

1. **Authentication**: All API calls must use valid Supabase JWT tokens
2. **Minimum KMA Diversity**: Responses must include at least 5 unique KMAs
3. **Response Format**: All responses must follow standardized format with proper field names
4. **Geographic Crawl**: Limited to 100 miles maximum radius

## Verification Script

We've created a simplified verification script in the `scripts` directory that developers can run locally to test API functionality.

### Prerequisites

- Node.js v16+
- Test user credentials (set as environment variables)

### Running the Script

1. **Set environment variables**

```bash
export TEST_USER_EMAIL=your@email.com
export TEST_USER_PASSWORD=yourpassword

# Optional: override default API URL (default: localhost:3000)
export API_URL=https://rapid-routes.vercel.app/api/intelligence-pairing
```

1. **Run the verification script**

```bash
node scripts/verify-intelligence-api.mjs
```

1. **Review the output**

The script provides clear indicators of success or failure:

- ✅ Authentication successful
- ✅ API call successful
- ✅ Found X unique KMAs (minimum 5)
- 🎉 VERIFICATION SUCCESSFUL!

### What the Script Tests

1. Authentication with Supabase
2. API connectivity and response format
3. Minimum KMA diversity requirement
4. Error handling and reporting

## Troubleshooting

### Authentication Errors

- Check that environment variables are correctly set
- Verify that the test user exists and has access
- Check for Supabase configuration issues

### KMA Diversity Issues

If the API returns fewer than 5 unique KMAs:

1. Check `geographicCrawl.js` to ensure radius limits are properly set
2. Verify city database has adequate coverage in test areas
3. Review the KMA assignment logic in the database

### Response Format Issues

If the API returns data in the wrong format:

1. Check the normalizeResponse function
2. Verify field mapping between camelCase and snake_case

## Conclusion

Regular verification of the intelligence-pairing API helps ensure that RapidRoutes continues to provide reliable lane generation for freight brokers. The verification script provides a simple way to confirm that changes don't break critical functionality.
