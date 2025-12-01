# 🚀 SAFE MULTI-USER ACTIVATION - QUICK START

## Current Status: ✅ READY (RLS Disabled for Safety)

Your multi-user system is **100% complete** but Row Level Security (RLS) is intentionally disabled so you can safely test and add users without any risk.

---

## 🎯 The 3-Step Process

### Step 1: Verify Readiness (30 seconds)

```bash
node scripts/preflight-check-rls.mjs
```

This checks:
- ✅ Your admin profile is configured
- ✅ Data has `organization_id` set
- ✅ Policies are defined
- ✅ API routes are ready

**If it passes: Proceed to Step 2**
**If it fails: Follow the fix instructions, then run again**

---

### Step 2: Test Signup (Optional but Recommended - 2 minutes)

1. Open **incognito browser** → Go to your app's `/signup`
2. Create test account:
   - Email: `test@tql.com`
   - Password: (your choice)
   - **Select your team** from dropdown
   - Role: **Apprentice**
3. Login with test account
4. Verify: Can see dashboard and your lanes

**Why test before RLS?**
- Confirms signup flow works
- Verifies team assignment works
- Zero risk since RLS is still off
- Can fix any issues before isolation kicks in

---

### Step 3: Enable RLS (5 minutes)

**Option A: Automated (Safest)**
```bash
node scripts/enable-rls-safely.mjs
```

This script:
- Enables RLS one table at a time
- Tests access before/after each table
- Auto-rolls back if anything fails
- Shows detailed progress

**Option B: Manual (More Control)**

1. Go to Supabase Dashboard → SQL Editor
2. Run: `migrations/enable-rls-helpers.sql`
3. Then run one at a time:

```sql
-- Enable on lanes (most important table)
SELECT safe_enable_rls('lanes');

-- ⚠️ TEST YOUR APP NOW - can you see/create lanes?
-- If yes, continue. If no, run: SELECT safe_disable_rls('lanes');

-- Enable on other tables
SELECT safe_enable_rls('blacklisted_cities');
SELECT safe_enable_rls('city_corrections');
SELECT safe_enable_rls('preferred_pickups');
SELECT safe_enable_rls('posted_pairs');
SELECT safe_enable_rls('city_performance');

-- Verify all enabled
SELECT * FROM check_all_rls_status();
```

---

## 🧪 Post-Activation Testing

After enabling RLS:

**Test 1: Your Account (Admin)**
- Login as yourself
- ✅ Should see all your lanes
- ✅ Should be able to create/edit/delete
- ✅ No errors or empty screens

**Test 2: Apprentice Account**
- Login as test apprentice (from Step 2)
- ✅ Should see your team's lanes
- ✅ Should be READ-ONLY (no create/edit buttons)
- ❌ Should NOT see other teams' lanes (if multiple brokers exist)

**Test 3: Support Account** (if you created one)
- Login as test support
- ✅ Should see your team's lanes
- ✅ Should be able to create/edit (but not delete)
- ❌ Should NOT see other teams' lanes

---

## 🛡️ Safety Features

### 1. You're Always Safe
Your `role = 'Admin'` **bypasses all RLS policies**. You'll always see everything.

### 2. Gradual Activation
Enable one table at a time. If one fails, others keep working.

### 3. Instant Rollback
```sql
-- Emergency disable
ALTER TABLE lanes DISABLE ROW LEVEL SECURITY;
```

### 4. No Data Loss
RLS only affects **who can see what**. It never deletes or modifies data.

---

## 📊 What Each Role Can Do

| Action | Admin | Broker | Support | Apprentice |
|--------|-------|--------|---------|------------|
| View all teams | ✅ | ❌ | ❌ | ❌ |
| View own team | ✅ | ✅ | ✅ | ✅ |
| Create lanes | ✅ | ✅ | ✅ | ❌ |
| Edit lanes | ✅ | ✅ | ✅ | ❌ |
| Delete lanes | ✅ | ✅ | ❌ | ❌ |

---

## 🆘 If Something Goes Wrong

### Problem: Can't see any lanes after enabling RLS

```sql
-- Check your profile
SELECT * FROM profiles WHERE email = 'your@email.com';

-- If organization_id is NULL:
UPDATE profiles 
SET organization_id = id, team_role = 'owner', role = 'Admin'
WHERE email = 'your@email.com';

-- Temporarily disable RLS to fix
ALTER TABLE lanes DISABLE ROW LEVEL SECURITY;
```

### Problem: Test user can't see any lanes

```sql
-- Check their profile
SELECT * FROM profiles WHERE email = 'test@tql.com';

-- They need YOUR organization_id:
UPDATE profiles 
SET organization_id = 'YOUR-ORG-ID-HERE'
WHERE email = 'test@tql.com';
```

### Emergency Rollback (Disables all RLS)

```sql
ALTER TABLE lanes DISABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE city_corrections DISABLE ROW LEVEL SECURITY;
ALTER TABLE preferred_pickups DISABLE ROW LEVEL SECURITY;
ALTER TABLE posted_pairs DISABLE ROW LEVEL SECURITY;
ALTER TABLE city_performance DISABLE ROW LEVEL SECURITY;
```

---

## ✅ Success Checklist

After activation, you should have:
- [ ] RLS enabled on all data tables
- [ ] You (Admin) can see all data
- [ ] Team members see only team data
- [ ] Apprentices are read-only
- [ ] Support can create/edit
- [ ] New signups work correctly
- [ ] No errors in browser console

---

## 📚 Additional Resources

- **Full Guide**: `RLS_ACTIVATION_GUIDE.md` (detailed explanations)
- **Architecture**: `AUTOMATED_SIGNUP_GUIDE.md` (how signup works)
- **Status**: `MULTI_USER_STATUS.md` (what's implemented)

---

## 🎯 TL;DR (30-Second Version)

```bash
# 1. Check if ready
node scripts/preflight-check-rls.mjs

# 2. Enable RLS (if check passed)
node scripts/enable-rls-safely.mjs

# 3. Test your app
#    - Can you see/create lanes? ✅
#    - Test accounts work? ✅
#    - Done! 🎉
```

**That's it!** Your multi-user system with team isolation is now live.

---

## 💡 Pro Tips

1. **Start with Step 1** - The preflight check catches 99% of issues
2. **Test signup BEFORE enabling RLS** - Easier to debug without isolation
3. **Enable RLS during low-traffic time** - Just in case rollback is needed
4. **Keep Supabase SQL Editor open** - For quick fixes if needed
5. **Your Admin role protects you** - You can't lock yourself out

**Ready? Start with:** `node scripts/preflight-check-rls.mjs` 🚀
