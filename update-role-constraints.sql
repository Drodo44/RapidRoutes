-- update-role-constraints.sql - Update database to support proper role hierarchy
-- Remove old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profile_role_check;

-- Add new constraint with proper roles
ALTER TABLE profiles ADD CONSTRAINT profile_role_check 
  CHECK (role IN ('Admin', 'Broker', 'Support', 'Apprentice'));

-- Update Kyle to Broker role
UPDATE profiles 
SET role = 'Broker' 
WHERE email = 'ktaylor@tql.com';

-- Show updated users
SELECT email, role, status FROM profiles ORDER BY email;
