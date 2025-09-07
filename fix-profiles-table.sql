-- fix-profiles-table.sql - Add missing active column and fix roles
-- Add the missing active column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT false;

-- Set active=true for approved users
UPDATE profiles SET active = true WHERE status = 'approved';

-- Fix TQL users to be Admin role and active
UPDATE profiles 
SET 
  role = 'Admin',
  status = 'approved', 
  active = true,
  updated_at = NOW()
WHERE email LIKE '%@tql.com';

-- Show updated profiles
SELECT id, email, role, status, active FROM profiles ORDER BY email;
