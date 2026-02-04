# RapidRoutes API Testing Guide

## Quick Start: Testing the Intelligence-Pairing API

Use one of these HTML test tools to verify the API is working:

1. **simple-api-test.html** - *Recommended* - Lightweight tool with no dependencies
2. **quick-api-verification.html** - More comprehensive tool that tests RPC function and API

## Step-by-Step Instructions

### Option 1: Simple API Test (Recommended)

1. Open a terminal and run:

   ```bash
   cd /workspaces/RapidRoutes
   python -m http.server 8080
   ```

2. Visit `http://localhost:8080/simple-api-test.html` in your browser

3. The tool will try to auto-detect your authentication token from localStorage.
   If not found, you'll need to paste your token manually:
   
   - Open your RapidRoutes application in another tab and log in
   - Open browser DevTools (F12 or right-click → Inspect)
   - Go to Application → Local Storage
   - Look for keys containing "auth-token"
   - Copy the access_token value
   - Paste into the "Authentication Token" field

4. Click "Test API" to send a request to the intelligence-pairing endpoint

5. Check the results panel for the API response

### Option 2: Extract Token and Test Directly

1. Open your RapidRoutes application in another tab and log in

2. Open browser DevTools (F12 or right-click → Inspect)

3. Open the Console tab

4. Copy and paste the contents of `extract-auth-token.js` into the console and press Enter

5. Copy the token that appears

6. Use this token in `simple-api-test.html` or with curl:

   ```bash
   curl -X POST http://localhost:3000/api/intelligence-pairing \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"lane":{"origin_city":"Raleigh","origin_state":"NC","origin_zip":"27601","dest_city":"Charlotte","dest_state":"NC","dest_zip":"28202","equipment_code":"V","weight_lbs":40000}}'
   ```

## Troubleshooting

### Authentication Issues

If you see "Cannot run tests: Not authenticated" or "Authentication error":

1. Make sure you're logged in to RapidRoutes in another browser tab
2. Try using the manual token input method in the simple test tool
3. Use `extract-auth-token.js` to get a valid token

### RPC Function Issues

If you see "Cannot test RPC: Missing credentials":

1. The RPC function test requires Supabase credentials
2. Use the "Test API Only" button which bypasses the RPC test
3. Or use the simpler `simple-api-test.html` tool which doesn't depend on RPC

### API Response Issues

If the API returns a 500 error:

1. Check if the RPC function `find_cities_within_radius` is created in the database
2. Verify your authentication token is valid and not expired
3. Try with different lane parameters

## Understanding the Test Tools

### simple-api-test.html

- Simple HTML form for testing the API endpoint
- Only tests the API, not the RPC function
- Shows detailed response information
- Works with any valid JWT token

### quick-api-verification.html

- More comprehensive testing
- Tests both the RPC function and API endpoint
- Requires Supabase credentials
- Multiple test modes: All Tests, RPC Only, API Only

### extract-auth-token.js

- Helper script to find and extract authentication tokens
- Run in browser console while logged in
- Shows token details including expiry date

## Next Steps

After verifying the API works:

1. Update the API code in production
2. Verify the RPC function exists in production database
3. Test with real user data
4. Monitor for any 500 errors
