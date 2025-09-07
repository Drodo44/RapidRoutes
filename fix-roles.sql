-- RapidRoutes Database Role System Fix
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Remove old role constraints (try both possible names)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profile_role_check;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

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
