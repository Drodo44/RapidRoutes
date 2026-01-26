# Next Steps for Production Verification

## Environment Configuration Required

To complete the verification of the intelligence-pairing API in production, the following steps must be taken:

1. Set the ALLOW_TEST_MODE environment variable in the Vercel dashboard:
   - Log in to the Vercel dashboard
   - Go to the RapidRoutes project settings
   - Navigate to Environment Variables
   - Add a new variable: `ALLOW_TEST_MODE` with value `true`
   - Save the changes
   - Redeploy the application (or trigger a new deployment)

## Verification Instructions

After setting up the environment variable:

1. Run the verification script:

   ```bash
   node scripts/verify-intelligence-api.mjs
   ```

2. Verify that all tests pass successfully with at least 6 unique KMAs per lane

3. Check that all debug endpoints return 404 Not Found

## Post-Verification Security

After verification is complete and all tests pass:

1. Set `ALLOW_TEST_MODE` to `false` in the Vercel dashboard to secure the production API
2. Run a final verification using authenticated requests to confirm everything works properly

## Troubleshooting

If verification continues to fail after setting the environment variable:

- Check the API logs in the Vercel dashboard for error messages
- Confirm that the ALLOW_TEST_MODE variable is set correctly
- Try deploying again to ensure the changes are picked up
- Verify that the intelligence-pairing.js changes were correctly pushed to the main branch
