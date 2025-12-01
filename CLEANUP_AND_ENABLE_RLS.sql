-- Complete RLS Cleanup and Enablement
-- This removes all old conflicting policies and creates clean new ones

-- =====================================================
-- STEP 1: Remove ALL existing policies
-- =====================================================

-- Remove all lanes policies
DROP POLICY IF EXISTS "Users can view their team's lanes" ON lanes;
DROP POLICY IF EXISTS "Users can insert lanes for their team" ON lanes;
DROP POLICY IF EXISTS "Users can update their team's lanes" ON lanes;
DROP POLICY IF EXISTS "Users can delete their team's lanes" ON lanes;
DROP POLICY IF EXISTS "Allow insert own lanes" ON lanes;
DROP POLICY IF EXISTS "Allow select own lanes" ON lanes;
DROP POLICY IF EXISTS "Approved users can manage lanes" ON lanes;
DROP POLICY IF EXISTS "Users can only see own lanes" ON lanes;
DROP POLICY IF EXISTS "Users can select their own lanes" ON lanes;
DROP POLICY IF EXISTS "lanes_delete_auth" ON lanes;
DROP POLICY IF EXISTS "lanes_insert_auth" ON lanes;
DROP POLICY IF EXISTS "lanes_select_all" ON lanes;
DROP POLICY IF EXISTS "lanes_update_auth" ON lanes;

-- Remove all blacklisted_cities policies
DROP POLICY IF EXISTS "Users can view their team's blacklisted cities" ON blacklisted_cities;
DROP POLICY IF EXISTS "Users can manage their team's blacklisted cities" ON blacklisted_cities;
DROP POLICY IF EXISTS "Anyone can view blacklisted cities" ON blacklisted_cities;
DROP POLICY IF EXISTS "Authenticated users can blacklist cities" ON blacklisted_cities;
DROP POLICY IF EXISTS "Authenticated users can remove blacklisted cities" ON blacklisted_cities;

-- Remove all city_corrections policies
DROP POLICY IF EXISTS "Users can view their team's city corrections" ON city_corrections;
DROP POLICY IF EXISTS "Users can manage their team's city corrections" ON city_corrections;
DROP POLICY IF EXISTS "Anyone can view city corrections" ON city_corrections;
DROP POLICY IF EXISTS "Authenticated users can manage corrections" ON city_corrections;

-- Remove all preferred_pickups policies
DROP POLICY IF EXISTS "Users can view their team's preferred pickups" ON preferred_pickups;
DROP POLICY IF EXISTS "Users can manage their team's preferred pickups" ON preferred_pickups;
DROP POLICY IF EXISTS "Users can modify their own preferred pickups" ON preferred_pickups;
DROP POLICY IF EXISTS "Users can view their own preferred pickups" ON preferred_pickups;

-- =====================================================
-- STEP 2: Disable RLS temporarily
-- =====================================================

ALTER TABLE lanes DISABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE city_corrections DISABLE ROW LEVEL SECURITY;
ALTER TABLE preferred_pickups DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Create clean team-based policies
-- =====================================================

-- LANES POLICIES
-- View: Admins see all, team members see their team's data
CREATE POLICY "team_lanes_select"
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

-- Insert: Brokers and Support can create
CREATE POLICY "team_lanes_insert"
ON lanes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('Admin', 'Broker', 'Support')
  )
);

-- Update: Brokers and Support can edit their team's lanes
CREATE POLICY "team_lanes_update"
ON lanes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = lanes.organization_id
    AND profiles.role IN ('Admin', 'Broker', 'Support')
  )
);

-- Delete: Only Admins and Brokers can delete
CREATE POLICY "team_lanes_delete"
ON lanes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = lanes.organization_id
    AND profiles.role IN ('Admin', 'Broker')
  )
);

-- BLACKLISTED CITIES POLICIES
CREATE POLICY "team_blacklist_select"
ON blacklisted_cities FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
  OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = blacklisted_cities.organization_id)
);

CREATE POLICY "team_blacklist_modify"
ON blacklisted_cities FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Broker', 'Support'))
);

-- CITY CORRECTIONS POLICIES
CREATE POLICY "team_corrections_select"
ON city_corrections FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
  OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = city_corrections.organization_id)
);

CREATE POLICY "team_corrections_modify"
ON city_corrections FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Broker', 'Support'))
);

-- PREFERRED PICKUPS POLICIES
CREATE POLICY "team_pickups_select"
ON preferred_pickups FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'Admin')
  OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = preferred_pickups.organization_id)
);

CREATE POLICY "team_pickups_modify"
ON preferred_pickups FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Broker', 'Support'))
);

-- =====================================================
-- STEP 4: Enable RLS on all tables
-- =====================================================

ALTER TABLE lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferred_pickups ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('lanes', 'blacklisted_cities', 'city_corrections', 'preferred_pickups')
ORDER BY tablename;

-- Check NEW policies exist (should be clean list)
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('lanes', 'blacklisted_cities', 'city_corrections', 'preferred_pickups')
ORDER BY tablename, policyname;
