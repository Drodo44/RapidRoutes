-- Enable RLS on lanes table
ALTER TABLE lanes ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own lanes" ON lanes;
DROP POLICY IF EXISTS "Users can modify their own lanes" ON lanes;
DROP POLICY IF EXISTS "Admins can view all lanes" ON lanes;
DROP POLICY IF EXISTS "Admins can modify all lanes" ON lanes;

-- Create user policies
CREATE POLICY "Users can view their own lanes"
  ON lanes FOR SELECT
  USING (
    auth.uid() = created_by
  );

CREATE POLICY "Users can modify their own lanes"
  ON lanes FOR ALL
  USING (
    auth.uid() = created_by
  );

-- Create admin policies
CREATE POLICY "Admins can view all lanes"
  ON lanes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );

CREATE POLICY "Admins can modify all lanes"
  ON lanes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'Admin'
    )
  );
