-- Fix RLS policies and permissions properly
-- This addresses the root causes:
-- 1. Circular RLS dependency
-- 2. Missing profile creation permissions
-- 3. Proper profile handling

-- First, ensure profiles table has email column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Update existing profiles with their emails
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
AND p.email IS NULL;

-- Drop existing policies to rebuild them properly
DROP POLICY IF EXISTS "Users can see own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can see all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Approved users can read lanes" ON lanes;
DROP POLICY IF EXISTS "Approved users can create lanes" ON lanes;
DROP POLICY IF EXISTS "Approved users can update lanes" ON lanes;
DROP POLICY IF EXISTS "Approved users can delete lanes" ON lanes;

-- Fix permissions first - crucial for initial setup
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lanes TO authenticated;

-- Create better profile policies
CREATE POLICY "Enable profile creation"
    ON profiles FOR INSERT
    WITH CHECK (
        auth.uid() = id -- Can only create own profile
    );

CREATE POLICY "Users can see own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update own non-admin fields"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND (role IS NULL OR role = 'User') -- Prevent self-promotion to admin
    );

CREATE POLICY "Admins can manage all profiles"
    ON profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
            AND status = 'approved'
        )
    );

-- Fix lane policies to avoid circular dependencies
CREATE POLICY "Approved users can manage lanes"
    ON lanes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND status = 'approved'
        )
    );

-- Improve admin function to handle email properly
CREATE OR REPLACE FUNCTION make_admin(admin_email text)
RETURNS void AS $$
BEGIN
    -- Insert or update the profile with all necessary fields
    INSERT INTO profiles (id, email, status, role)
    SELECT 
        u.id,
        u.email,
        'approved',
        'Admin'
    FROM auth.users u
    WHERE u.email = admin_email
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        role = 'Admin',
        status = 'approved';

    -- If no user found, raise an error
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with email % not found', admin_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
