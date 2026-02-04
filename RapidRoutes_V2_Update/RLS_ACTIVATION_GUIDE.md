# 🔐 Safe RLS Activation Guide

## Current Status: Foundation Complete, RLS DISABLED

Your multi-user system is fully built but **RLS is intentionally disabled** for safety. This guide will help you enable it without breaking anything.

---

## ⚡ Quick Start (3 Steps)

### Step 1: Verify Everything is Ready (2 minutes)

```bash
# Check database structure
node -e "
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Check your profile
const profile = await s.from('profiles').select('*').eq('email', 'aconnellan@tql.com').single();
console.log('Your Profile:', JSON.stringify(profile.data, null, 2));

// Check lane counts
const lanes = await s.from('lanes').select('id, organization_id').limit(5);
console.log('\\nSample Lanes:', JSON.stringify(lanes.data, null, 2));
"
```

**Expected output:**
- Your profile has `organization_id` = your user ID
- Your profile has `role` = 'Admin' and `team_role` = 'owner'
- Lanes have `organization_id` populated

### Step 2: Install Helper Functions (1 minute)

Go to your Supabase dashboard → SQL Editor → Run this file:
```
migrations/enable-rls-helpers.sql
```

This adds safe enable/disable functions.

### Step 3: Enable RLS One Table at a Time (5 minutes)

**Option A: Via Supabase SQL Editor (Recommended)**

```sql
-- 1. Check current status
SELECT * FROM check_all_rls_status();

-- 2. Enable on lanes table first
SELECT safe_enable_rls('lanes');

-- 3. TEST IMMEDIATELY - Go to your app and:
--    - View dashboard (should see your lanes)
--    - Create a new lane (should work)
--    - Edit an existing lane (should work)

-- 4. If something broke, rollback:
SELECT safe_disable_rls('lanes');

-- 5. If all good, continue with other tables:
SELECT safe_enable_rls('blacklisted_cities');
SELECT safe_enable_rls('city_corrections');
SELECT safe_enable_rls('preferred_pickups');
SELECT safe_enable_rls('posted_pairs');
SELECT safe_enable_rls('city_performance');

-- 6. Verify all enabled
SELECT * FROM check_all_rls_status();
```

**Option B: Via Script (Automated)**

```bash
node scripts/enable-rls-safely.mjs
```

This script:
- ✅ Checks each table before enabling
- ✅ Verifies policies exist
- ✅ Tests access before and after
- ✅ Auto-rolls back if something fails
- ✅ Provides detailed progress report

---

## 🧪 Testing Multi-User Access

### Test 1: Create a Test Apprentice Account

1. **Open incognito browser window**
2. Go to your app's `/signup` page
3. Fill out:
   - Email: `test-apprentice@tql.com`
   - Password: (test password)
   - Select your broker team from dropdown
   - Role: **Apprentice** (View Only)
4. Click "Sign up"
5. Login with those credentials

**Expected Behavior:**
- ✅ With RLS disabled: Sees all your lanes
- ✅ With RLS enabled: Sees only your team's lanes (same effect since they're on your team)
- ✅ Can view data but cannot create/edit (Apprentice role)

### Test 2: Create a Test Support Account

Same as above but choose **Support** role.

**Expected Behavior:**
- ✅ Can view all your team's lanes
- ✅ Can create new lanes for your team
- ✅ Can edit existing lanes
- ✅ Cannot delete lanes (only Brokers can)

### Test 3: Verify Isolation (Optional - Requires 2nd Broker)

To test that teams are truly isolated, you'd need to:
1. Create a second broker account manually in Supabase
2. Set their `organization_id` = their user ID, `team_role` = 'owner'
3. Create test lanes for that broker
4. Verify you cannot see their lanes (and vice versa)

---

## 🔍 What Changes When RLS is Enabled?

### Before RLS (Current State):
```
Database Query: SELECT * FROM lanes
Result: ALL 164 lanes from ALL brokers
```

### After RLS (With team isolation):
```
Database Query: SELECT * FROM lanes
Result: Only lanes where organization_id = YOUR organization_id
        (Or ALL if you're Admin)
```

### RLS Policy Logic:

**For Admins (like you):**
```sql
-- You bypass ALL restrictions
-- See everything across all teams
-- Always have full access
```

**For Brokers:**
```sql
-- See lanes where organization_id = their organization_id
-- Can create, edit, delete lanes for their team
```

**For Support:**
```sql
-- See lanes where organization_id = their team's organization_id
-- Can create, edit (but not delete) lanes for their team
```

**For Apprentices:**
```sql
-- See lanes where organization_id = their team's organization_id
-- READ ONLY - cannot create, edit, or delete
```

---

## 🛡️ Safety Features Built-In

### 1. Admin Bypass
Your account (`role = 'Admin'`) always bypasses RLS:
- You see ALL teams' data
- You can manage everything
- RLS doesn't restrict you

### 2. Gradual Enablement
Enable one table at a time:
- If `lanes` breaks → disable it, fix policies, try again
- Other tables still work normally
- No all-or-nothing risk

### 3. Easy Rollback
Disable instantly if needed:
```sql
ALTER TABLE lanes DISABLE ROW LEVEL SECURITY;
```

### 4. Existing Data Protected
All your existing lanes have `organization_id` set:
- No data will be "lost" when RLS enables
- Everything is already tagged correctly
- Just flipping the visibility switch

---

## 📊 Verification Checklist

Before enabling RLS, verify:
- [ ] Your profile has `organization_id` populated
- [ ] Your profile has `role = 'Admin'`
- [ ] All lanes have `organization_id` set
- [ ] Migration `step3-team-based-rls.sql` has been run
- [ ] Policies exist for each table

After enabling RLS, verify:
- [ ] You can still see your lanes
- [ ] You can create new lanes
- [ ] You can edit existing lanes
- [ ] Test accounts see only appropriate data
- [ ] Apprentices are read-only
- [ ] Support can create/edit

---

## 🚨 Troubleshooting

### Problem: "Cannot see any lanes after enabling RLS"

**Cause:** Your profile might not have `organization_id` set

**Fix:**
```sql
-- Check your profile
SELECT * FROM profiles WHERE email = 'aconnellan@tql.com';

-- If organization_id is NULL, set it:
UPDATE profiles 
SET organization_id = id, team_role = 'owner'
WHERE email = 'aconnellan@tql.com';

-- Verify lanes have organization_id
SELECT COUNT(*) as total, 
       COUNT(organization_id) as with_org_id 
FROM lanes;

-- If lanes missing organization_id, backfill:
UPDATE lanes 
SET organization_id = (
  SELECT organization_id FROM profiles WHERE profiles.id = lanes.created_by
)
WHERE organization_id IS NULL;
```

### Problem: "New lanes don't get organization_id"

**Cause:** API route not setting it

**Fix:** Check `/pages/api/lanes.js` - should have this code around line 274:
```javascript
organization_id: organizationId, // Team ownership
```

### Problem: "Apprentice can edit lanes"

**Cause:** Role not set correctly or policies not working

**Fix:**
```sql
-- Check their profile
SELECT email, role, team_role, organization_id 
FROM profiles 
WHERE email = 'test-apprentice@tql.com';

-- Role should be 'Apprentice', not 'Support' or 'Admin'

-- Test policy manually
SELECT * FROM lanes 
WHERE organization_id = 'your-org-id-here'
LIMIT 1;
```

---

## 🎯 Recommended Activation Order

**Phase 1: Preparation (Do this first)**
1. ✅ Run `migrations/enable-rls-helpers.sql` in Supabase
2. ✅ Verify your profile is properly configured
3. ✅ Verify existing data has `organization_id`

**Phase 2: Test Signup (Do before RLS)**
1. ✅ Create test Apprentice account via `/signup`
2. ✅ Verify they can access app (see everything - RLS still off)
3. ✅ Verify their profile has correct `organization_id`

**Phase 3: Enable RLS (The actual activation)**
1. ✅ Enable on `lanes` table first
2. ✅ Test immediately (you + test accounts)
3. ✅ If good, enable on remaining tables
4. ✅ Verify permissions work as expected

**Phase 4: Live Testing**
1. ✅ Have real team members sign up
2. ✅ Verify they see only your team's data
3. ✅ Verify Apprentice vs Support permissions work
4. ✅ Monitor for any unexpected issues

---

## 📝 SQL Quick Reference

```sql
-- Check RLS status on all tables
SELECT * FROM check_all_rls_status();

-- Enable RLS on a table
SELECT safe_enable_rls('lanes');

-- Disable RLS on a table (rollback)
SELECT safe_disable_rls('lanes');

-- Check your profile
SELECT * FROM profiles WHERE email = 'your@email.com';

-- Check policies on a table
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'lanes';

-- Manual enable (if helper functions don't work)
ALTER TABLE lanes ENABLE ROW LEVEL SECURITY;

-- Manual disable (emergency rollback)
ALTER TABLE lanes DISABLE ROW LEVEL SECURITY;
```

---

## 🎉 Success Criteria

You'll know it's working when:
- ✅ You (Admin) can see all data
- ✅ Team members see only your team's data
- ✅ Apprentices can view but not edit
- ✅ Support can view and edit
- ✅ New lanes get tagged with correct `organization_id`
- ✅ No broken queries or empty dashboards
- ✅ Signup flow works smoothly

---

## 🆘 Emergency Rollback

If anything goes wrong, immediately run:

```sql
-- Disable RLS on all tables
ALTER TABLE lanes DISABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE city_corrections DISABLE ROW LEVEL SECURITY;
ALTER TABLE preferred_pickups DISABLE ROW LEVEL SECURITY;
ALTER TABLE posted_pairs DISABLE ROW LEVEL SECURITY;
ALTER TABLE city_performance DISABLE ROW LEVEL SECURITY;
```

Your app will work exactly as before. No data is lost or affected.

---

**Ready to activate? Start with Step 1 and take it slow!** 🚀
