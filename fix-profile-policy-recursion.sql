-- Fix infinite recursion in profiles and lanes RLS policies
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Approved users can manage lanes" ON lanes;

-- Create simpler profile policy with direct checks
CREATE POLICY "Admins can manage all profiles" ON profiles
AS PERMISSIVE FOR ALL
TO public
USING (
  status = 'approved' 
  AND role = 'Admin' 
  AND id = auth.uid()
);

-- Create simpler lanes policy with direct profile check
CREATE POLICY "Approved users can manage lanes" ON lanes
AS PERMISSIVE FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE id = auth.uid() 
    AND status = 'approved'
  )
);

-- Fix infinite recursion in lanes RLS policy
DROP POLICY "Approved users can manage lanes" ON lanes;

CREATE POLICY "Approved users can manage lanes" ON lanes
AS PERMISSIVE FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() IN (
      SELECT id FROM profiles 
      WHERE status = 'approved'
    )
  )
);
