-- Add status field to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS status varchar(20) NOT NULL DEFAULT 'pending';

-- Add constraint to limit status values
ALTER TABLE profiles 
ADD CONSTRAINT profile_status_check 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing profiles to be approved (since they were created before this change)
UPDATE profiles SET status = 'approved' WHERE status = 'pending';

-- Create a function to handle new profile creation with pending status
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert new profile with pending status
  INSERT INTO profiles (id, email, role, active, status)
  VALUES (
    NEW.id,
    NEW.email,
    'User',  -- Default role
    false,   -- Not active until approved
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger for handling new signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_profile();

-- Add RLS policy to prevent access until approved
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view approved profiles"
  ON profiles FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );
