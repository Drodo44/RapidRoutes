# Final Verification Instructions

## Environment Setup

1. Confirm that `ALLOW_TEST_MODE=true` is set in the Vercel dashboard:
   - Log in to the Vercel dashboard
   - Select the RapidRoutes project
   - Go to Settings > Environment Variables
   - Verify the variable is set to `true`
   - Trigger a redeployment if necessary

## Verification Process

Once the environment variable is properly set, follow these steps:

1. **Run the monitoring script to check deployment status:**

   ```bash
   node scripts/monitor-deployment.mjs
   ```

   This will check every 20 seconds for up to 10 attempts if the deployment is complete.

2. **Alternatively, run the verification script directly:**

   ```bash
   node scripts/verify-intelligence-api.mjs
   ```

   This should show at least 6 unique KMAs for each test lane.

3. **Test the frontend:**
   - Visit the RapidRoutes application
   - Click "Generate Pairings" on a lane form
   - Confirm that results are returned without 401 errors

## Final Security Step

After successful verification, set `ALLOW_TEST_MODE` back to `false`:

1. Return to the Vercel dashboard
2. Update the environment variable
3. Trigger a redeployment

## Updating Verification Status

Once verification is complete, update the PRODUCTION_VERIFIED.md file:

1. Change status to "✅ FULLY VERIFIED"
2. Document the number of unique KMAs returned
3. Update the completed tasks list
4. Commit and push the changes

## Troubleshooting

If verification fails:

- Check Vercel logs for deployment errors
- Verify the environment variable is set correctly
- Ensure the deployment has completed successfully
- Check for any error messages in the API response
