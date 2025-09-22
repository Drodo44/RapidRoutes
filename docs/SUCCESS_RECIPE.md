# ✅ RapidRoutes Production Success Recipe

## 🔐 Required Environment Variables (Vercel)

### Core Variables (Required in All Environments)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://gwuhjxomavulwduhvgvi.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Test vs Production Settings

| Variable | Test Environment | Production Environment | Notes |
|----------|------------------|------------------------|-------|
| `ALLOW_TEST_MODE` | `true` | `false` | Disable in production after verification |
| `ENABLE_MOCK_AUTH` | `true` | `false` | Only for development testing |
| `VERIFICATION_API_KEY` | `<test key>` | `<secure key>` | Keep secure in Settings |

## 🔒 Auth Strategy

RapidRoutes implements an enterprise-grade authentication strategy:

### Token Management

- **Primary Token Source**: `supabase.auth.getSession()`
- **Fallback Method**: `supabase.auth.getUser()` when session is unavailable
- **Token Delivery**: `Authorization: Bearer <token>` header + `credentials: 'include'`

### Token Refresh Logic

1. **Automatic Refresh**: Tokens are refreshed when:
   - Token is expired
   - Token will expire within 5 minutes
   - Authentication fails with 401 Unauthorized

2. **Refresh Implementation**:

   ```javascript
   const { data, error } = await supabase.auth.refreshSession();
   ```

3. **Browser Compatibility**: Uses browser-compatible base64 decoding for tokens

## 🌎 KMA Requirements

Key Market Area (KMA) diversity is a critical business requirement:

- **Minimum Required KMAs**: 6 unique KMAs for any valid request
- **Target KMAs**: 12 unique KMAs for optimal diversity
- **Radius**: Initial search radius of 75 miles, expanding to 150 miles if necessary
- **Validation**: Both frontend and backend enforce the 6 KMA minimum requirement
- **Error Handling**: Returns 422 Unprocessable Content if KMA diversity requirements not met

## 🧪 Verification Script

Run:

```bash
node verify-deployment-fix.mjs
```

Confirms:

- API returns ≥6 unique KMAs
- test_mode bypasses auth
- Production verification endpoint works

## 🧠 API Endpoints and Expectations

### Primary Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|--------------|
| `/api/intelligence-pairing` | POST | Generate city pairings for a lane | Yes |
| `/api/rr-number` | GET | Generate reference numbers | Yes |
| `/api/lane-performance` | GET | Retrieve performance metrics | Yes |
| `/api/health` | GET | API health check | No |

### Intelligence Pairing Endpoint

- **URL**: `/api/intelligence-pairing`
- **Method**: POST
- **Auth**: Required (Bearer token)
- **Features**:
  - Accepts `test_mode: true` (if ALLOW_TEST_MODE is set)
  - Requires auth if test_mode is false
  - Returns valid lane data with minimum 6 unique KMAs
  - Provides detailed error messages for debugging

### Request Format

```json
{
  "originCity": "Chicago",
  "originState": "IL",
  "destCity": "New York", 
  "destState": "NY",
  "equipmentCode": "V"
}
```

## 🖱️ Frontend Integration

- **Generate Pairings** button triggers pairing request
- Automatic token refresh when tokens expire or are about to expire
- Enhanced error handling for authentication failures
- No 401 errors in verified flow

## 📦 Deployment Details

- **Latest Verified Commit**: `ad3da0c59c6d0c76f0bf343846386b375983beb2`
- **Previous Stable Commit**: `c0e9961263a4ae5645a61cb26ad8d8cab90b59d5`
- **Tagged Version**: `v1.0-auth-stable`
- **Deployment Platform**: Vercel with auto-deployment from main branch
- **Updated Documentation**:
  - `PRODUCTION_VERIFIED.md`
  - `DEPLOYMENT_FIX_SUMMARY.md`
  - `DISABLE_TEST_MODE.md`

## ⚠️ DO NOT MODIFY Without Caution

- `intelligence-pairing.js`
- `geographicCrawl.js`
- `verify-deployment-fix.mjs`
- `utils/authUtils.js`
- `utils/apiAuthUtils.js`

## 🛡️ Restore Instructions

If anything breaks:

1. Checkout the known working commit:

   ```bash
   git fetch origin
   git checkout ad3da0c59c6d0c76f0bf343846386b375983beb2
   ```

2. Verify environment variables in Vercel dashboard:
   - Ensure all required variables are set correctly
   - Make sure `ALLOW_TEST_MODE=false` in production

3. Redeploy from the verified commit:

   ```bash
   git push -f origin ad3da0c59c6d0c76f0bf343846386b375983beb2:main
   ```

4. Run verification script:

   ```bash
   node scripts/verify-production.js
   ```

5. Manually verify critical functionality:
   - Log in and navigate to Post Options page
   - Generate pairings for a lane
   - Confirm no 401/500 errors appear in console
   - Verify pairs have at least 6 unique KMAs
