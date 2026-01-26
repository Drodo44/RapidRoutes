# 🔧 Vercel Environment Variable Configuration Guide

**Purpose**: Ensure all required environment variables are configured in Vercel for production deployment.

---

## 🚀 Quick Setup

### 1. Access Vercel Dashboard
Navigate to: `https://vercel.com/[your-project]/settings/environment-variables`

### 2. Required Variables

Configure the following variables for **Production**, **Preview**, and **Development** environments:

---

## 📋 Environment Variables Checklist

### Supabase Configuration (REQUIRED)

#### Client-Side Variables (Exposed to Browser)
These are automatically exposed to the browser with `NEXT_PUBLIC_` prefix:

```bash
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://gwuhjxomavulwduhvgvi.supabase.co

# Supabase Anonymous Key (public-safe)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Server-Side Fallback Variables (NOT exposed to browser)
These are used by API routes as fallback when NEXT_PUBLIC_ vars aren't available:

```bash
# Server-side Supabase URL fallback
SUPABASE_URL=https://gwuhjxomavulwduhvgvi.supabase.co

# Server-side Supabase Anon Key fallback
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Admin Operations (CRITICAL - NEVER expose to browser)
⚠️ **Security Warning**: This key bypasses Row-Level Security. Only use in API routes!

```bash
# Supabase Service Role Key (admin access)
# ⚠️ NEVER add NEXT_PUBLIC_ prefix to this variable!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Usage**: Used by `utils/supabaseAdminClient.js` for admin operations in API routes only.

---

### HERE Geocoding API (OPTIONAL)

```bash
# HERE API Key for geocoding services
# Only needed if using city coordinate resolution
HERE_API_KEY=your_here_api_key_here
```

**Note**: Not required for core functionality. Used for advanced geocoding features.

---

### Optional Configuration

```bash
# Enable detailed pairing debug logs (set to '1' to enable)
PAIRING_DEBUG=0

# Optional: adjust retry backoff (milliseconds)
RAPIDROUTES_RETRY_BACKOFF=250
```

---

## 🛡️ Security Best Practices

### DO ✅
- ✅ Use `NEXT_PUBLIC_` prefix for client-exposed variables (URL, ANON_KEY)
- ✅ Keep `SUPABASE_SERVICE_ROLE_KEY` without `NEXT_PUBLIC_` prefix
- ✅ Configure both prefixed and unprefixed versions for fallback logic
- ✅ Set environment variables in all three Vercel environments (Production, Preview, Development)
- ✅ Verify variables are set correctly using `npm run validate:env`

### DON'T ❌
- ❌ NEVER add `NEXT_PUBLIC_` prefix to `SUPABASE_SERVICE_ROLE_KEY`
- ❌ NEVER use service role key in client-side components
- ❌ NEVER commit `.env.local` to version control
- ❌ NEVER share service role key in public documentation
- ❌ NEVER log service role key in browser console

---

## 📸 Vercel Dashboard Setup Steps

### Step 1: Navigate to Environment Variables
1. Go to your Vercel project dashboard
2. Click **Settings** in the top navigation
3. Click **Environment Variables** in the left sidebar

### Step 2: Add Each Variable
For each variable listed above:

1. **Key**: Enter the variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
2. **Value**: Paste the value (e.g., `https://gwuhjxomavulwduhvgvi.supabase.co`)
3. **Environments**: Select all three:
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development
4. Click **Save**

### Step 3: Verify Configuration
After adding all variables, redeploy your application:

```bash
# Trigger redeploy via Git push
git commit --allow-empty -m "chore: trigger Vercel redeploy to apply env vars"
git push origin main
```

---

## 🧪 Validation & Testing

### Local Validation
Before deploying, validate your local environment:

```bash
# Validate environment variables
npm run validate:env

# Expected output:
# ✅ NEXT_PUBLIC_SUPABASE_URL
# ✅ SUPABASE_URL
# ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
# ✅ SUPABASE_ANON_KEY
# ✅ SUPABASE_SERVICE_ROLE_KEY
# ⚠️ HERE_API_KEY (optional)
```

### Production Verification
After deployment, verify production health:

```bash
# Wait for Vercel deployment (~60 seconds), then run:
npm run check:prod

# Expected output:
# ✅ Passed: 10
# ❌ Failed: 0
# Success Rate: 100% (10/10)
```

---

## 🔍 Troubleshooting

### Error: "Server Supabase vars missing"

**Cause**: Missing unprefixed server-side variables.

**Solution**:
1. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` (without `NEXT_PUBLIC_` prefix) in Vercel
2. Redeploy application
3. Verify with `npm run check:prod`

### Error: "SUPABASE_SERVICE_ROLE_KEY not found"

**Cause**: Service role key not configured or has incorrect prefix.

**Solution**:
1. Verify variable name is exactly `SUPABASE_SERVICE_ROLE_KEY` (NO `NEXT_PUBLIC_` prefix)
2. Check value starts with `eyJ` (JWT format)
3. Ensure variable is set in all three environments
4. Redeploy application

### Error: Admin operations failing with 401/403

**Cause**: Service role key not properly configured or exposed to browser.

**Solution**:
1. Check that `SUPABASE_SERVICE_ROLE_KEY` has NO `NEXT_PUBLIC_` prefix
2. Verify usage is ONLY in API routes (not client components)
3. Check `utils/supabaseAdminClient.js` is importing correctly
4. Review console logs for `[Admin Supabase]` messages

### Environment variables not updating after deployment

**Cause**: Vercel caches build artifacts and environment variables.

**Solution**:
1. Update environment variables in Vercel dashboard
2. Trigger a new deployment (empty commit or via dashboard)
3. Wait for full deployment completion (~60 seconds)
4. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)
5. Verify with `npm run check:prod`

---

## 📚 Related Documentation

- [ROBUSTNESS_IMPROVEMENTS.md](./ROBUSTNESS_IMPROVEMENTS.md) - Null safety and fallback logic
- [ENV_CONFIG_FIX.md](./ENV_CONFIG_FIX.md) - Environment variable fallback implementation
- [.env.example](./.env.example) - Local environment template
- [scripts/validate-env.js](./scripts/validate-env.js) - Environment validation script

---

## ✅ Configuration Checklist

Before deploying to production, verify:

- [ ] All 5 Supabase variables configured in Vercel
- [ ] `SUPABASE_SERVICE_ROLE_KEY` has NO `NEXT_PUBLIC_` prefix
- [ ] All variables set in Production, Preview, and Development environments
- [ ] Local environment validated with `npm run validate:env`
- [ ] Build successful with `npm run build`
- [ ] Production health check passing with `npm run check:prod`
- [ ] Service role key never exposed to browser (check Network tab)
- [ ] Admin operations working in API routes

---

## 🎯 Quick Reference

### Minimum Required Variables (Production)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://gwuhjxomavulwduhvgvi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_URL=https://gwuhjxomavulwduhvgvi.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (NO NEXT_PUBLIC_ PREFIX!)
```

### Recommended Commands
```bash
# Validate environment
npm run validate:env

# Build locally
npm run build

# Verify production
npm run check:prod

# Trigger Vercel redeploy
git commit --allow-empty -m "chore: trigger redeploy"
git push origin main
```

---

*Last updated: October 19, 2025*  
*Verified with commit: c671e9f*  
*Deployment status: ✅ Production ready*
