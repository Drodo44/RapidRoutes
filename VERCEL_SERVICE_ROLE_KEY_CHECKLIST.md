# ✅ Vercel SERVICE_ROLE_KEY Configuration Checklist

**Date**: October 19, 2025  
**Purpose**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is properly configured in Vercel  
**Critical**: This key must NEVER have `NEXT_PUBLIC_` prefix!

---

## 📋 Step-by-Step Configuration

### ✅ Step 1: Get Service Role Key from Supabase

1. **Open Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/gwuhjxomavulwduhvgvi
   ```

2. **Navigate to Settings**:
   - Click **Settings** (gear icon in left sidebar)
   - Select **API** section

3. **Locate Service Role Key**:
   - Scroll to "Project API keys" section
   - Find the key labeled **`service_role`** (NOT `anon` or `public`)
   - Look for the **secret** key (hidden by default)

4. **Copy the Key**:
   - Click "Reveal" or eye icon to show the key
   - Copy the **entire JWT token** (starts with `eyJ`)
   - Length should be ~240 characters

   **Visual Example**:
   ```
   ┌─────────────────────────────────────────────────────┐
   │ Project API keys                                    │
   ├─────────────────────────────────────────────────────┤
   │                                                     │
   │ anon                                                │
   │ public  eyJhbGciOi... (public - safe for browser)  │
   │                                                     │
   │ service_role  👈 THIS ONE!                          │
   │ secret  eyJhbGciOi... (NEVER expose to browser!)   │
   │                                                     │
   └─────────────────────────────────────────────────────┘
   ```

---

### ✅ Step 2: Add Environment Variable in Vercel

1. **Open Vercel Dashboard**:
   ```
   https://vercel.com/dashboard
   ```

2. **Select Project**:
   - Find and click your **RapidRoutes** project
   - Or navigate directly to your project URL

3. **Access Environment Variables**:
   - Click **Settings** tab at the top
   - Click **Environment Variables** in the left sidebar

4. **Add New Variable**:
   - Click **"Add New"** button (top right)

5. **Configure Variable**:
   ```
   ┌─────────────────────────────────────────────────────┐
   │ Add Environment Variable                            │
   ├─────────────────────────────────────────────────────┤
   │                                                     │
   │ Key (required):                                     │
   │ ┌─────────────────────────────────────────────────┐ │
   │ │ SUPABASE_SERVICE_ROLE_KEY                       │ │
   │ └─────────────────────────────────────────────────┘ │
   │                                                     │
   │ Value (required):                                   │
   │ ┌─────────────────────────────────────────────────┐ │
   │ │ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc...   │ │
   │ └─────────────────────────────────────────────────┘ │
   │                                                     │
   │ Environment (required):                             │
   │ ☑️ Production                                        │
   │ ☑️ Preview                                           │
   │ ☐ Development (optional)                            │
   │                                                     │
   │              [Cancel]  [Save]                       │
   └─────────────────────────────────────────────────────┘
   ```

6. **Critical Checks Before Saving**:
   - [ ] Key is exactly `SUPABASE_SERVICE_ROLE_KEY`
   - [ ] Key has **NO** `NEXT_PUBLIC_` prefix
   - [ ] Value starts with `eyJ`
   - [ ] **Production** is checked ✅
   - [ ] **Preview** is checked ✅

7. **Save Variable**:
   - Click **Save** button

---

### ✅ Step 3: Redeploy Application

**Why?** Environment variables are baked into the build at deployment time.

#### Option A: Via Vercel Dashboard (Recommended)

1. Click **Deployments** tab
2. Find the most recent deployment
3. Click the **"..."** menu (three dots)
4. Select **"Redeploy"**
5. Confirm redeploy
6. Wait ~60 seconds for deployment to complete

#### Option B: Via Git Push

```bash
# From your local terminal
git commit --allow-empty -m "chore: trigger redeploy for SUPABASE_SERVICE_ROLE_KEY"
git push origin main
```

---

### ✅ Step 4: Verify Configuration

Wait for deployment to complete (~60 seconds), then run verification:

#### Verification Method 1: Production Test Script

```bash
npm run check:prod
```

**Expected Output**:
```
✅ Passed:   10
❌ Failed:   0
Success Rate: 100% (10/10)
```

#### Verification Method 2: Service Role Key Test

```bash
node scripts/verify-service-role-production.mjs
```

**Expected Output**:
```
✅ City Performance API
   Status: 200 (expected)

✅ Lanes API
   Status: 200 (expected)

✅ Environment Check
   Status: 200 (expected)

✅ Health Check
   Status: 200 (expected)

━━━ Summary ━━━

✅ Passed: 4/4 (100%)

╔═══════════════════════════════════════════════════════════════╗
║  ✅ SERVICE_ROLE_KEY VERIFIED IN PRODUCTION ✅                ║
╚═══════════════════════════════════════════════════════════════╝
```

#### Verification Method 3: Browser Console

1. Open production site: `https://rapid-routes.vercel.app`
2. Open DevTools (F12)
3. Check Console tab for:

   **✅ Expected Message**:
   ```
   ✅ [Admin Supabase] Service role key configured successfully
   ```

   **❌ Error Message** (if not configured):
   ```
   ⚠️ [Admin Supabase] SUPABASE_SERVICE_ROLE_KEY not found in environment variables
   ```

---

## 🔍 Troubleshooting

### Issue 1: Variable Not Taking Effect

**Symptoms**:
- Still seeing warning messages after save
- Admin operations returning errors

**Solution**:
1. Ensure you clicked **"Save"** in Vercel
2. **Redeploy** is required (environment variables are baked at build time)
3. Wait for deployment to complete (~60 seconds)
4. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

### Issue 2: Admin Operations Return 401/403

**Symptoms**:
- API endpoints like `/api/city-performance` return unauthorized errors
- Database queries fail with permission errors

**Solution**:
1. Verify you copied the **service_role** key (not anon key)
2. Check the key starts with `eyJ` (JWT format)
3. Ensure variable name has **NO** `NEXT_PUBLIC_` prefix
4. Redeploy after making changes

### Issue 3: Key Visible in Browser Network Tab

**Symptoms**:
- Service role key appears in browser Network tab
- Key visible in client-side JavaScript

**Solution**:
🚨 **CRITICAL SECURITY ISSUE!**

1. **Immediately** remove `NEXT_PUBLIC_` prefix from variable name
2. Variable should be `SUPABASE_SERVICE_ROLE_KEY` (NOT `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`)
3. Redeploy to remove key from client bundle
4. Verify key is only used in `/pages/api/*` routes (server-side)
5. Never import `utils/supabaseAdminClient.js` in client components

### Issue 4: Local Works But Production Fails

**Symptoms**:
- Everything works in local development
- Production shows errors about missing service role key

**Solution**:
1. Local uses `.env.local`, production uses Vercel environment variables
2. Verify variable is configured in **Vercel Dashboard** (not just locally)
3. Check variable is set for **Production** environment
4. Redeploy after adding variable

---

## 🛡️ Security Checklist

Before marking complete, verify:

- [ ] Variable name is `SUPABASE_SERVICE_ROLE_KEY` (exact match)
- [ ] Variable has **NO** `NEXT_PUBLIC_` prefix
- [ ] Key is the **service_role** key (not anon key)
- [ ] Key starts with `eyJ` (JWT format)
- [ ] Variable is set in **Production** environment
- [ ] Variable is set in **Preview** environment
- [ ] Application has been **redeployed** after adding variable
- [ ] Production verification shows 100% test pass rate
- [ ] Key does **NOT** appear in browser DevTools → Network tab
- [ ] Key is only used in `/pages/api/*` routes (server-side)
- [ ] `utils/supabaseAdminClient.js` is not imported in client components

---

## 📊 Expected Results After Configuration

### Console Messages
```
✅ [Admin Supabase] Service role key configured successfully
```

### Production Test Results
```
✅ Health Check API              200 OK
✅ Environment Variables         All present
✅ Database Tables               10/10 accessible
✅ City Performance API          Starred cities: 0
✅ Lanes API                     Working correctly
```

### API Endpoint Tests
- `/api/city-performance` → 200 OK
- `/api/lanes` → 200 OK
- `/api/admin/*` → 200 OK (varies by endpoint)
- `/api/health` → 200 OK

---

## 📚 Additional Resources

- **VERCEL_ENV_SETUP.md** - Complete Vercel environment variable guide
- **ROBUSTNESS_IMPROVEMENTS.md** - SERVICE_ROLE_KEY implementation details
- **.env.example** - Local environment template
- **scripts/validate-env.js** - Local environment validation script
- **scripts/verify-service-role-production.mjs** - Production verification test

---

## ✅ Completion Checklist

Mark each item as complete:

- [ ] Retrieved service_role key from Supabase Dashboard
- [ ] Added `SUPABASE_SERVICE_ROLE_KEY` in Vercel (NO NEXT_PUBLIC_ prefix)
- [ ] Selected Production and Preview environments
- [ ] Saved the variable
- [ ] Redeployed the application
- [ ] Waited 60 seconds for deployment
- [ ] Verified with `npm run check:prod` (100% pass rate)
- [ ] Checked browser console (✅ success message)
- [ ] Tested admin API endpoints (all working)
- [ ] Confirmed key NOT visible in browser Network tab
- [ ] Monday presentation ready! 🎉

---

**Status**: ⏳ **AWAITING CONFIGURATION**

After completing all steps, run:
```bash
node scripts/verify-service-role-production.mjs
```

If you see "✅ SERVICE_ROLE_KEY VERIFIED IN PRODUCTION", you're done! 🎉

---

*Document created: October 19, 2025*  
*For: RapidRoutes Production Deployment*  
*Critical for: Monday demonstration readiness*
