# Supabase Singleton Migration Guide

## ✅ Completed (Production Critical)

The following critical files have been migrated to use the singleton pattern:

1. **lib/supabaseClient.js** - Main singleton module ✅
2. **utils/supabaseClient.js** - Re-exports singleton ✅  
3. **utils/supabaseAdminClient.js** - Uses getServerSupabase() ✅
4. **pages/api/exportHead.js** - Uses getServerSupabase() ✅

## 🔧 Migration Pattern

### For Browser/Client Code
```javascript
// ❌ OLD - Don't do this
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, anonKey);

// ✅ NEW - Do this instead
import { getBrowserSupabase } from '@/lib/supabaseClient';
const supabase = getBrowserSupabase();
```

### For Server/API Routes
```javascript
// ❌ OLD - Don't do this
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, serviceRoleKey);

// ✅ NEW - Do this instead
import { getServerSupabase } from '@/lib/supabaseClient';
const supabase = getServerSupabase();
```

### For Legacy Code (Backward Compatible)
```javascript
// These still work but should be migrated gradually
import { supabase } from '@/utils/supabaseClient';
import { adminSupabase } from '@/utils/supabaseAdminClient';
```

## 📋 Remaining Files to Migrate

### Priority 1: Production API Routes
- [ ] pages/api/check-lanes.js
- [ ] pages/api/debug-intelligent-crawl.js
- [ ] pages/api/importCities.js
- [ ] pages/api/production-verification.js
- [ ] pages/api/server-api-verification.js
- [ ] pages/api/verify-api.js
- [ ] pages/api/verify-intelligence-api.js

### Priority 2: Services & Libraries
- [ ] lib/RRNumberSystem.js
- [ ] lib/RecapSystem.js
- [ ] services/laneService.js
- [ ] middleware/auth.unified.js

### Priority 3: Scripts (Lower Priority)
These are mostly one-off migration/setup scripts:
- [ ] scripts/02-verify-migration.js
- [ ] scripts/add-missing-cities.js
- [ ] scripts/apply-migrations.js
- [ ] scripts/cleanup-kma-final.js
- [ ] scripts/process_performance_queue.js
- [ ] scripts/run-migrations.js
- [ ] scripts/setup-admin-fixed.js
- [ ] scripts/setup-admin.js
- [ ] scripts/setup-tables.js
- [ ] scripts/standardize-kma-*.js
- [ ] scripts/test-db-connection*.js
- [ ] scripts/verify-deployment.js
- [ ] scripts/verify-missing-cities.js

### Priority 4: Test Files (Can Skip)
These are not in production:
- [ ] test-utils/supabaseTestClient.js
- [ ] test/mock-supabase.js
- [ ] tests/setupTests.js
- [ ] tests/testSetup.js

### Priority 5: Analysis Scripts (Can Skip)
These are debug/analysis tools:
- [ ] analyze-*.js
- [ ] comprehensive-api-verification.js
- [ ] db-inspection-with-env.js
- [ ] direct-api-fix.js
- [ ] final-verification.js
- [ ] fix-rpc-function.js
- [ ] generate-test-token.js
- [ ] get-auth-token.js
- [ ] migrate-database.js
- [ ] production-verification.js
- [ ] verify-*.js

## 🚀 Deployment Strategy

### Phase 1: Core Infrastructure (✅ DONE)
- Singleton module created
- Main utilities migrated
- Critical API endpoint fixed
- Verification script added

### Phase 2: Production API Routes (TODO)
Migrate all `pages/api/*.js` files to use singleton pattern.

### Phase 3: Services & Libraries (TODO)
Update service layer and shared libraries.

### Phase 4: Scripts (Optional)
Can be done incrementally as scripts are used.

## 🔍 Verification

Run the verification script to check progress:

```bash
npm run verify:supabase-singleton
```

This will show which files still have direct `createClient()` calls.

## ⚠️ Important Notes

1. **Never bypass the singleton** - Always use `getBrowserSupabase()` or `getServerSupabase()`
2. **Storage key is 'rr-auth'** - Don't set different keys anywhere
3. **Server code only** - Never import `getServerSupabase()` in client components
4. **Environment check** - The singleton throws helpful errors if env vars are missing

## 📚 Benefits

- ✅ **No more duplicate clients** - Single GoTrueClient instance
- ✅ **No more crashes** - Graceful error handling for missing env vars
- ✅ **Better security** - Service role key never in browser bundle
- ✅ **Auth persistence** - Consistent storage key across all components
- ✅ **Build-time validation** - Verification script catches violations before deployment

## 🎯 Current Status

**Production Critical**: ✅ Complete  
**API Routes**: 🟡 In Progress (1/8 done)  
**Services**: 🟡 In Progress (0/4 done)  
**Scripts**: ⚪ Not Started  
**Tests**: ⚪ Not Required  

## 📝 Next Steps

1. Migrate Priority 1 API routes
2. Test deployment to ensure no regressions
3. Gradually migrate Priority 2-3 as time permits
4. Update any new code to follow singleton pattern
