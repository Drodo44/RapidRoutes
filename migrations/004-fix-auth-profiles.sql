-- migrations/004-fix-auth-profiles.sql

-- First, ensure the profiles table has the correct structure
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'User' CHECK (role IN ('User', 'Admin')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the handle_new_user function with proper profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, status, role)
    VALUES (
        NEW.id,
        CASE 
            WHEN NEW.email LIKE '%@tql.com' THEN 'approved'
            ELSE 'pending'
        END,
        CASE 
            WHEN NEW.email LIKE '%@tql.com' THEN 'User'
            ELSE 'User'
        END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any existing users that don't have one
INSERT INTO public.profiles (id, status, role)
SELECT 
    id,
    CASE 
        WHEN email LIKE '%@tql.com' THEN 'approved'
        ELSE 'pending'
    END as status,
    'User' as role
FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = users.id
);
