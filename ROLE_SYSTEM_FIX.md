# RapidRoutes User Role System Fix

## The Problem
Your authentication system was failing because:
1. Missing `active` column in profiles table
2. Database constraint only allowed 'User' and 'Admin' roles
3. Your system needs 4-tier hierarchy: Admin, Broker, Support, Apprentice
4. Double authentication layers causing conflicts

## What I Fixed in Code
✅ **Removed conflicting withAuth HOCs** - Now uses single AuthContext  
✅ **Updated AuthContext** - Added role hierarchy functions  
✅ **Fixed auth middleware** - Checks status instead of missing active column  
✅ **Updated NavBar** - Shows role badge and role-based navigation  
✅ **Promoted you to Admin** - aconnellan@tql.com is now Admin  

## Manual Database Fix Required

Run this SQL in your Supabase Dashboard → SQL Editor:

```sql
-- 1. Remove old role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profile_role_check;

-- 2. Add new role constraint with your 4-tier system
ALTER TABLE profiles ADD CONSTRAINT profile_role_check 
  CHECK (role IN ('Admin', 'Broker', 'Support', 'Apprentice'));

-- 3. Update Kyle to Broker role
UPDATE profiles 
SET role = 'Broker' 
WHERE email = 'ktaylor@tql.com';

-- 4. Add missing active column (optional - code works without it)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
UPDATE profiles SET active = true WHERE status = 'approved';

-- 5. Verify the fix
SELECT email, role, status FROM profiles ORDER BY email;
```

## Your Role Hierarchy
- **👑 Admin** (You): Full system access, manage users, all features
- **💼 Broker** (Kyle): Core brokerage features, lane management, DAT exports  
- **🛠️ Support**: Customer support functions, limited admin access
- **📚 Apprentice**: Basic access, training mode, limited features

## After Running SQL
1. Restart your dev server
2. Login with your credentials
3. You should see your Admin role badge in the navbar
4. Kyle can login as Broker role
5. Admin panel will only be visible to you

## Navigation Access
- **Dashboard**: Everyone
- **Lanes**: Apprentice and above
- **Recap**: Apprentice and above  
- **Admin**: Admin only (you)
- **Profile**: Everyone

The authentication system is now fixed and ready for your freight brokerage platform!
