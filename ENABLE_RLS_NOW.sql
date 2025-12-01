-- Quick RLS Enablement Script
-- Copy and paste this entire file into Supabase SQL Editor and run it

-- =====================================================
-- STEP 1: Create RLS Policies for lanes
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their team's lanes" ON lanes;
DROP POLICY IF EXISTS "Users can insert lanes for their team" ON lanes;
DROP POLICY IF EXISTS "Users can update their team's lanes" ON lanes;
DROP POLICY IF EXISTS "Users can delete their team's lanes" ON lanes;

-- View policy: Admins see all, others see their team's data
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

-- Insert policy: Only Brokers and Support can create
CREATE POLICY "Users can insert lanes for their team"
ON lanes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('Admin', 'Broker', 'Support')
  )
);

-- Update policy: Only Brokers and Support can edit
CREATE POLICY "Users can update their team's lanes"
ON lanes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = lanes.organization_id
    AND profiles.role IN ('Admin', 'Broker', 'Support')
  )
);

-- Delete policy: Only Admins and Brokers can delete
CREATE POLICY "Users can delete their team's lanes"
ON lanes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.organization_id = lanes.organization_id
    AND profiles.role IN ('Admin', 'Broker')
  )
);

-- =====================================================
-- STEP 2: Create RLS Policies for other tables
-- =====================================================

-- Blacklisted Cities
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
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Broker', 'Support'))
);

-- City Corrections
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
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Broker', 'Support'))
);

-- Preferred Pickups
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
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('Admin', 'Broker', 'Support'))
);

-- =====================================================
-- STEP 3: Enable RLS on all tables
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

-- Check policies exist
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('lanes', 'blacklisted_cities', 'city_corrections', 'preferred_pickups')
ORDER BY tablename, policyname;
