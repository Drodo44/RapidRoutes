-- STEP 3: Team-Based Multi-User System
-- This implements team/organization structure where:
-- - Admins see everything
-- - Brokers are team owners, see their team's data
-- - Support can edit their team's data
-- - Apprentices can only view their team's data

-- =====================================================
-- PART 1: Add team structure to profiles
-- =====================================================

-- Add organization_id to profiles (team identifier)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add team_role to distinguish team owner from members
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS team_role TEXT CHECK (team_role IN ('owner', 'member'));

-- Backfill: Set you as the team owner with a UUID as your organization
-- Your apprentice and support will get the same organization_id when they sign up
UPDATE profiles 
SET 
  organization_id = id,  -- Your user ID becomes your org ID
  team_role = 'owner'
WHERE id = '389fa9a8-50e8-401f-a896-c9004ec99356';

-- =====================================================
-- PART 2: Add organization_id to data tables
-- =====================================================

-- Add organization_id to lanes (team ownership)
ALTER TABLE lanes 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add organization_id to blacklisted_cities
ALTER TABLE blacklisted_cities 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add organization_id to city_corrections
ALTER TABLE city_corrections 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Add organization_id to preferred_pickups
ALTER TABLE preferred_pickups 
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- =====================================================
-- PART 3: Backfill organization_id from created_by
-- =====================================================

-- For lanes: set org_id to the creator's org_id
UPDATE lanes 
SET organization_id = (
  SELECT organization_id 
  FROM profiles 
  WHERE profiles.id = lanes.created_by
)
WHERE organization_id IS NULL;

-- For blacklisted_cities
UPDATE blacklisted_cities 
SET organization_id = (
  SELECT organization_id 
  FROM profiles 
  WHERE profiles.id = blacklisted_cities.created_by
)
WHERE organization_id IS NULL;

-- For city_corrections
UPDATE city_corrections 
SET organization_id = (
  SELECT organization_id 
  FROM profiles 
  WHERE profiles.id = city_corrections.created_by
)
WHERE organization_id IS NULL;

-- For preferred_pickups
UPDATE preferred_pickups 
SET organization_id = (
  SELECT organization_id 
  FROM profiles 
  WHERE profiles.id = preferred_pickups.created_by
)
WHERE organization_id IS NULL;

-- =====================================================
-- PART 4: Create RLS Policies (NOT ENABLED YET)
-- =====================================================

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their team's lanes" ON lanes;
DROP POLICY IF EXISTS "Users can insert lanes for their team" ON lanes;
DROP POLICY IF EXISTS "Users can update their team's lanes" ON lanes;
DROP POLICY IF EXISTS "Users can delete their team's lanes" ON lanes;

-- Lanes policies
CREATE POLICY "Users can view their team's lanes"
ON lanes FOR SELECT
USING (
  -- Admins see everything
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'Admin'
  )
  OR
  -- Team members see their team's data
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = lanes.organization_id
  )
);

CREATE POLICY "Users can insert lanes for their team"
ON lanes FOR INSERT
WITH CHECK (
  -- Admins can create anywhere
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'Admin'
  )
  OR
  -- Brokers and Support can create for their team (not Apprentices)
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = lanes.organization_id
    AND profiles.role IN ('Broker', 'Support')
  )
);

CREATE POLICY "Users can update their team's lanes"
ON lanes FOR UPDATE
USING (
  -- Admins can update anything
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'Admin'
  )
  OR
  -- Brokers and Support can update their team's data
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = lanes.organization_id
    AND profiles.role IN ('Broker', 'Support')
  )
);

CREATE POLICY "Users can delete their team's lanes"
ON lanes FOR DELETE
USING (
  -- Only Admins and Brokers can delete
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = lanes.organization_id
    AND profiles.role IN ('Admin', 'Broker')
  )
);

-- =====================================================
-- Apply same pattern to other tables
-- =====================================================

-- Blacklisted Cities policies
DROP POLICY IF EXISTS "Users can view their team's blacklisted cities" ON blacklisted_cities;
DROP POLICY IF EXISTS "Users can manage their team's blacklisted cities" ON blacklisted_cities;

CREATE POLICY "Users can view their team's blacklisted cities"
ON blacklisted_cities FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
  OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = blacklisted_cities.organization_id)
);

CREATE POLICY "Users can manage their team's blacklisted cities"
ON blacklisted_cities FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
  OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = blacklisted_cities.organization_id AND profiles.role IN ('Broker', 'Support'))
);

-- City Corrections policies
DROP POLICY IF EXISTS "Users can view their team's city corrections" ON city_corrections;
DROP POLICY IF EXISTS "Users can manage their team's city corrections" ON city_corrections;

CREATE POLICY "Users can view their team's city corrections"
ON city_corrections FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
  OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = city_corrections.organization_id)
);

CREATE POLICY "Users can manage their team's city corrections"
ON city_corrections FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
  OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = city_corrections.organization_id AND profiles.role IN ('Broker', 'Support'))
);

-- Preferred Pickups policies
DROP POLICY IF EXISTS "Users can view their team's preferred pickups" ON preferred_pickups;
DROP POLICY IF EXISTS "Users can manage their team's preferred pickups" ON preferred_pickups;

CREATE POLICY "Users can view their team's preferred pickups"
ON preferred_pickups FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
  OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = preferred_pickups.organization_id)
);

CREATE POLICY "Users can manage their team's preferred pickups"
ON preferred_pickups FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
  OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = preferred_pickups.organization_id AND profiles.role IN ('Broker', 'Support'))
);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check profiles structure
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_rows,
  COUNT(organization_id) as with_org_id,
  COUNT(team_role) as with_team_role
FROM profiles;

-- Check data tables
SELECT 
  'lanes' as table_name,
  COUNT(*) as total_rows,
  COUNT(organization_id) as with_org_id,
  COUNT(created_by) as with_created_by
FROM lanes
UNION ALL
SELECT 
  'blacklisted_cities' as table_name,
  COUNT(*) as total_rows,
  COUNT(organization_id) as with_org_id,
  COUNT(created_by) as with_created_by
FROM blacklisted_cities
UNION ALL
SELECT 
  'city_corrections' as table_name,
  COUNT(*) as total_rows,
  COUNT(organization_id) as with_org_id,
  COUNT(created_by) as with_created_by
FROM city_corrections
UNION ALL
SELECT 
  'preferred_pickups' as table_name,
  COUNT(*) as total_rows,
  COUNT(organization_id) as with_org_id,
  COUNT(created_by) as with_created_by
FROM preferred_pickups;

-- Check your profile
SELECT 
  id,
  email,
  role,
  organization_id,
  team_role,
  organization_id = id as is_org_owner
FROM profiles
WHERE email = 'aconnellan@tql.com';
