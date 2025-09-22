# RapidRoutes Intelligence API Verification

This directory contains tools and documentation for verifying the RapidRoutes intelligence-pairing API functionality in production.

## Verification Scripts

### Direct API Authentication Test

Tests the API's authentication security without requiring Supabase credentials:

```bash
node scripts/direct-api-test.mjs
```

### Complete Intelligence API Verification

Performs a full verification of the intelligence-pairing API including KMA diversity requirements:

```bash
# Set Supabase anon key as environment variable
export NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Run the verification with email and password
node final-intelligence-verification.mjs user@example.com password
```

## Verification Reports

- [Direct API Verification Report](./DIRECT_API_VERIFICATION_REPORT.md) - Authentication security verification
- [Final Production Verification](./FINAL_PRODUCTION_VERIFICATION.md) - Comprehensive API verification status

## KMA Diversity Requirements

The intelligence-pairing API must return at least 5 unique KMAs (Key Market Areas) for each lane pair to meet the business requirements. This ensures sufficient geographic diversity for load posting in the DAT system.

## How to Run a Complete Verification

1. Verify environment variables are properly configured in production
2. Test authentication security with direct-api-test.mjs
3. Perform authenticated testing with final-intelligence-verification.mjs
4. Review verification results in intelligence-verification-results.json

## Troubleshooting

If you encounter authentication issues:

1. Verify Supabase URL and anon key are correct
2. Check user credentials have proper permissions
3. Ensure network connectivity to Supabase services
4. Check for JWT token expiration or format issues
