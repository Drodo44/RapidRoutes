-- migrations/005.5-create-sql-executor.sql
-- Function to execute SQL with admin privileges
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
