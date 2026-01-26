# Production Environment Verification Guide

## Issue Summary

We've detected issues with environment variables in the production environment, particularly related to test mode and mock authentication. This guide outlines steps to verify and fix these issues.

## Debugging Code Added

1. Enhanced error responses in the `intelligence-pairing` API
2. Debug utility functions in `utils/envDebugger.js`
3. Debug endpoint at `/api/debug/env-check.js`
4. Test scripts for local and production testing

## Deployment Steps

1. Deploy the latest code changes to Vercel

   ```bash
   vercel --prod
   ```

2. Set environment variables in the Vercel dashboard:
   - `ALLOW_TEST_MODE=true`
   - `ENABLE_MOCK_AUTH=true`

3. Alternatively, set the environment variables via the Vercel CLI:

   ```bash
   vercel env add ALLOW_TEST_MODE production
   # Enter "true" when prompted
   
   vercel env add ENABLE_MOCK_AUTH production
   # Enter "true" when prompted
   ```

4. Deploy again to apply the environment variables:

   ```bash
   vercel --prod
   ```

## Verification Steps

After deployment, run the environment check script:

```bash
node test-env-variables-prod.cjs
```

This will show the environment variables and computed values in the production environment.

You can also test the API endpoints directly:

```bash
node test-production-api.cjs
```

## Expected Results

1. The environment check should show:
   - `ALLOW_TEST_MODE: true`
   - `ENABLE_MOCK_AUTH: true`
   - `testModeEnabled: true`
   - `mockAuthEnabled: true`

2. The API tests with `test_mode=true` should succeed without requiring authentication

## Security Notes

- The debug endpoint `/api/debug/env-check` requires a special token
- Remove or secure this endpoint after troubleshooting is complete
- Only expose the minimum necessary information for debugging
