-- Comprehensive Auth System Fix
-- This addresses all root causes:
-- 1. Schema inconsistencies
-- 2. RLS policy conflicts
-- 3. Profile creation issues
-- 4. Permission problems

-- First, ensure we have a proper profiles table
CREATE TABLE IF NOT EXISTS profiles_new (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'User',
    status TEXT NOT NULL DEFAULT 'pending',
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT profile_role_check CHECK (role IN ('User', 'Admin')),
    CONSTRAINT profile_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Migrate existing data
INSERT INTO profiles_new (id, email, role, status, active, created_at, updated_at)
SELECT 
    p.id,
    u.email,
    p.role,
    COALESCE(p.status, 'pending'),
    COALESCE(p.active, false),
    p.created_at,
    p.updated_at
FROM profiles p
JOIN auth.users u ON u.id = p.id
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Drop all existing policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
    DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
    DROP POLICY IF EXISTS "Users can only view approved profiles" ON profiles;
    DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
    DROP POLICY IF EXISTS "Enable profile creation" ON profiles;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors from non-existent policies
END $$;

-- Swap tables
ALTER TABLE profiles RENAME TO profiles_old;
ALTER TABLE profiles_new RENAME TO profiles;

-- Create proper indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);

-- Grant proper permissions
GRANT ALL ON profiles TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create clear, non-conflicting policies
CREATE POLICY "Enable profile creation"
    ON profiles FOR INSERT
    WITH CHECK (
        auth.uid() = id
    );

CREATE POLICY "Users can always read own profile"
    ON profiles FOR SELECT
    USING (
        auth.uid() = id
    );

CREATE POLICY "Users can update own non-admin fields"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        (role IS NULL OR role = 'User')  -- Prevent self-promotion to admin
    );

CREATE POLICY "Admins can do everything"
    ON profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
            AND status = 'approved'
        )
    );

-- Create better profile creation trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert with proper defaults and email tracking
    INSERT INTO public.profiles (id, email, status, role, active)
    VALUES (
        NEW.id,
        NEW.email,
        CASE 
            WHEN NEW.email LIKE '%@tql.com' THEN 'approved'
            ELSE 'pending'
        END,
        'User',
        CASE 
            WHEN NEW.email LIKE '%@tql.com' THEN true
            ELSE false
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Improve admin function to handle edge cases
CREATE OR REPLACE FUNCTION make_admin(admin_email text)
RETURNS void AS $$
BEGIN
    -- First try to find and update existing profile
    UPDATE profiles 
    SET 
        role = 'Admin',
        status = 'approved',
        active = true,
        updated_at = NOW()
    WHERE email = admin_email;

    -- If no profile exists but user does, create it
    IF NOT FOUND THEN
        INSERT INTO profiles (id, email, role, status, active)
        SELECT 
            id,
            email,
            'Admin',
            'approved',
            true
        FROM auth.users 
        WHERE email = admin_email
        ON CONFLICT (id) DO UPDATE
        SET 
            role = 'Admin',
            status = 'approved',
            active = true,
            updated_at = NOW();
    END IF;

    -- If still no profile, user doesn't exist
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No user found with email: %', admin_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix any existing TQL admin accounts
DO $$ 
BEGIN
    UPDATE profiles 
    SET 
        status = 'approved',
        role = 'Admin',
        active = true
    WHERE email LIKE '%@tql.com'
    AND id IN (
        SELECT id FROM auth.users WHERE email LIKE '%@tql.com'
    );
END $$;
