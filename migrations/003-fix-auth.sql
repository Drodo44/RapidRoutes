-- migrations/003-fix-auth.sql

-- Drop existing policies to recreate them with proper auth checks
DROP POLICY IF EXISTS "Everyone can read lanes" ON lanes;
DROP POLICY IF EXISTS "Users can create their own lanes" ON lanes;
DROP POLICY IF EXISTS "Users can update their own lanes" ON lanes;
DROP POLICY IF EXISTS "Users can delete their own lanes" ON lanes;

-- Create new policies that check for approved status
CREATE POLICY "Approved users can read lanes"
    ON lanes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND status = 'approved'
        )
    );

CREATE POLICY "Approved users can create lanes"
    ON lanes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND status = 'approved'
        )
    );

CREATE POLICY "Approved users can update lanes"
    ON lanes FOR UPDATE
    USING (
        (auth.uid() = created_by AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND status = 'approved'
        ))
        OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'Admin'
            AND status = 'approved'
        )
    );

CREATE POLICY "Approved users can delete lanes"
    ON lanes FOR DELETE
    USING (
        (auth.uid() = created_by AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND status = 'approved'
        ))
        OR 
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'Admin'
            AND status = 'approved'
        )
    );

-- Ensure profiles have correct schema
ALTER TABLE profiles 
ALTER COLUMN status SET DEFAULT 'pending',
ALTER COLUMN status SET NOT NULL,
ADD CONSTRAINT profile_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
ALTER COLUMN role SET DEFAULT 'User',
ALTER COLUMN role SET NOT NULL,
ADD CONSTRAINT profile_role_check CHECK (role IN ('User', 'Admin'));

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing profile policies
DROP POLICY IF EXISTS "Users can see own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Create proper profile policies
CREATE POLICY "Users can see own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Admins can see all profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
            AND status = 'approved'
        )
    );

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'Admin'
            AND status = 'approved'
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON lanes TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- Create admin user function for convenience
CREATE OR REPLACE FUNCTION make_admin(email text)
RETURNS void AS $$
BEGIN
    INSERT INTO profiles (id, status, role)
    SELECT id, 'approved', 'Admin'
    FROM auth.users 
    WHERE auth.users.email = make_admin.email
    ON CONFLICT (id) DO UPDATE
    SET role = 'Admin', status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
