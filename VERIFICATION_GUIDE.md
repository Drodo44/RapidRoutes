# RapidRoutes Production API Verification Guide

This guide explains how to verify that the intelligence-pairing API works end-to-end in production.

## Prerequisites

1. Node.js installed on your system
2. A valid Supabase account with access to RapidRoutes
3. Environment variables set up correctly

## Setting up Environment Variables

Before running the verification script, you need to set up the following environment variables:

```bash
export TEST_USER_EMAIL=your@email.com
export TEST_USER_PASSWORD=yourpassword
```

Replace `your@email.com` and `yourpassword` with valid credentials for a RapidRoutes account.

## Running the Verification Script

1. Clone the RapidRoutes repository (if you haven't already):

   ```bash
   git clone https://github.com/Drodo44/RapidRoutes.git
   cd RapidRoutes
   ```

2. Make sure you have the latest version:

   ```bash
   git pull origin main
   ```

3. Run the verification script:

   ```bash
   node verify-production-api.mjs
   ```

## Understanding the Results

The script will:

1. Authenticate with Supabase using your credentials
2. Call the production API at `https://rapid-routes.vercel.app/api/intelligence-pairing`
3. Verify that the response includes at least 5 unique KMAs
4. Save the response to a file for further analysis

### Success Criteria

- Authentication successful: You'll see "✅ Authentication successful!"
- API call successful: You'll see "✅ Success! Received 200 OK response"
- Sufficient KMA diversity: You'll see "✅ REQUIREMENT MET: X unique KMAs (minimum 5)"
- Final success message: "🎉 VERIFICATION SUCCESSFUL! 🎉"

### Common Issues

- **Authentication failure**: Check your environment variables and ensure they contain valid credentials
- **API timeout**: The API might take longer to respond during high traffic periods
- **Insufficient KMAs**: If the API returns fewer than 5 unique KMAs, it indicates an issue with the intelligence system

## Troubleshooting

If you encounter issues:

1. Check the Vercel deployment logs for any errors
2. Verify that your authentication is working correctly
3. Try running the verification against the local development server first
4. Check that all required environment variables are set correctly

## Next Steps

If the verification passes, the lane generation system is working correctly in production. Users should be able to click "Generate Pairings" in the UI and get results with at least 5 unique KMAs.

If the verification fails, check the specific error messages and logs to identify and fix the issue.
