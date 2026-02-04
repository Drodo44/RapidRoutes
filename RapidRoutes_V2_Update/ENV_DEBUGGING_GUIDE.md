# Environment Variable and Authentication Debugging Guide

This document outlines the debugging tools and processes available for troubleshooting environment variable and authentication issues in the RapidRoutes application.

## Overview

The application includes several debugging endpoints and utilities designed to help diagnose issues with:

1. Environment variables (NODE_ENV, ALLOW_TEST_MODE, ENABLE_MOCK_AUTH)
2. Authentication flow and token handling
3. Test mode and mock authentication configuration
4. Request validation and processing

## Available Debug Tools

### 1. Debug Environment Endpoint

A dedicated endpoint for testing environment configuration:

```http
GET /api/debug/environment
```

This endpoint provides comprehensive information about the server environment, including:

- Environment variables
- Runtime information
- Authentication configuration
- Test mode settings

#### Headers

- `X-Debug-Env: true` - Required to enable debug output
- `X-Debug-Token: [token]` - Required in production environments

### 2. Intelligence Pairing Debug Mode

The intelligence pairing endpoint includes built-in debugging:

```json
POST /api/intelligence-pairing
{
  "origin_city": "Cincinnati",
  "origin_state": "OH",
  "destination_city": "Chicago",
  "destination_state": "IL",
  "equipment_code": "V",
  "test_mode": true,
  "mock_auth": true,
  "debug_env": true
}
```

Setting `debug_env: true` returns detailed diagnostic information instead of the normal API response.

### 3. Debug Utility Scripts

Two utility scripts are available for debugging:

#### Environment Testing Script

```bash
node scripts/test-env-variables.js
```

This script starts a development server with specific environment variables and tests the debug endpoints.

#### Intelligence Endpoint Test

```bash
node scripts/test-intelligence-endpoint.js
```

This script runs a series of tests against the intelligence pairing endpoint with various test mode and mock auth configurations.

## Environment Variables

The following environment variables control authentication and test behavior:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode (development/production) | - |
| `ALLOW_TEST_MODE` | Enable test mode in production | false |
| `ENABLE_MOCK_AUTH` | Allow mock authentication | false |
| `DEBUG_AUTH_TOKEN` | Token for accessing debug endpoints in production | - |

## Debug Process

When troubleshooting environment or authentication issues:

1. Start by checking environment variables:

   ```bash
   node scripts/test-env-variables.js
   ```

2. Test the intelligence endpoint with various configurations:

   ```bash
   node scripts/test-intelligence-endpoint.js
   ```

3. Check the server logs for detailed authentication debugging output (look for `🔐 Auth Configuration:` entries)

4. Use the browser developer tools to examine network requests and responses

## Security Considerations

- Debug endpoints are automatically disabled in production environments
- To enable debugging in production, set a secure `DEBUG_AUTH_TOKEN` and provide it in requests
- Never commit debug tokens to source control
- Remove or disable debug endpoints before final production deployment

## Resolving Common Issues

### Issue: Test Mode Not Working in Production

1. Verify `ALLOW_TEST_MODE=true` is set in the environment
2. Ensure `test_mode: true` is included in the request body
3. Check server logs for the calculated `useTestMode` value

### Issue: Mock Authentication Failing

1. Verify `ENABLE_MOCK_AUTH=true` is set in the environment
2. Ensure `mock_auth: true` is included in the request body
3. Check for middleware that might be blocking unauthenticated requests

### Issue: Environment Variables Not Available

1. Verify the variables are properly set in the deployment platform
2. Check for typos in variable names
3. Restart the application server after changing environment variables
