-- Fix infinite recursion in profiles RLS policy
DROP POLICY "Admins can manage all profiles" ON profiles;

CREATE POLICY "Admins can manage all profiles" ON profiles
AS PERMISSIVE FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() IN (
      SELECT id FROM profiles 
      WHERE role = 'Admin' AND status = 'approved'
    )
  )
);
