-- First make sure all needed fields exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role varchar(20) DEFAULT 'User',
ADD COLUMN IF NOT EXISTS active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS status varchar(20) DEFAULT 'pending';

-- Create admin role if it doesn't exist
DO $$ 
BEGIN
  -- Get first user and make them admin
  UPDATE profiles 
  SET role = 'Admin',
      status = 'approved',
      active = true
  WHERE id IN (
    SELECT id 
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1
  );
END $$;
