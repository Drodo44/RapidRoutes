-- Helper functions for safely enabling RLS
-- These can be called via Supabase SQL editor or via RPC

-- Function to check if RLS is enabled on a table
CREATE OR REPLACE FUNCTION check_rls_status(table_name text)
RETURNS boolean AS $$
DECLARE
  rls_enabled boolean;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = table_name;
  
  RETURN COALESCE(rls_enabled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely enable RLS with verification
CREATE OR REPLACE FUNCTION safe_enable_rls(table_name text)
RETURNS jsonb AS $$
DECLARE
  rls_enabled boolean;
  policy_count integer;
  result jsonb;
BEGIN
  -- Check if already enabled
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = table_name;
  
  IF rls_enabled THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', format('RLS already enabled on %s', table_name),
      'already_enabled', true
    );
  END IF;
  
  -- Check for policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = table_name;
  
  IF policy_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', format('No policies found for %s - run migration first', table_name),
      'policy_count', 0
    );
  END IF;
  
  -- Enable RLS
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('RLS enabled on %s', table_name),
    'policy_count', policy_count,
    'already_enabled', false
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM,
    'error', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to disable RLS (rollback safety)
CREATE OR REPLACE FUNCTION safe_disable_rls(table_name text)
RETURNS jsonb AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', table_name);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('RLS disabled on %s', table_name)
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM,
    'error', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get RLS status for all relevant tables
CREATE OR REPLACE FUNCTION check_all_rls_status()
RETURNS TABLE(
  table_name text,
  rls_enabled boolean,
  policy_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.tablename::text,
    t.rowsecurity,
    COUNT(p.policyname)
  FROM pg_tables t
  LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = 'public'
  WHERE t.schemaname = 'public'
  AND t.tablename IN ('lanes', 'blacklisted_cities', 'city_corrections', 'preferred_pickups', 'posted_pairs', 'city_performance', 'profiles')
  GROUP BY t.tablename, t.rowsecurity
  ORDER BY t.tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
