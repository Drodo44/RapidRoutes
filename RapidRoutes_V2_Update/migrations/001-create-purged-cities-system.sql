-- Migration: Create DAT City Verification & Purge Management System
-- Date: 2025-08-29
-- Description: Creates purged_cities table and adds HERE.com verification tracking

-- 1. Add here_verified column to existing cities table
ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS here_verified BOOLEAN DEFAULT false;

-- 2. Create purged_cities table
CREATE TABLE IF NOT EXISTS purged_cities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city TEXT NOT NULL,
    state_or_province TEXT NOT NULL,
    zip TEXT,
    original_kma_code TEXT,
    original_kma_name TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    purged_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    purge_reason TEXT NOT NULL,
    dat_submission_status TEXT CHECK (dat_submission_status IN ('pending', 'submitted', 'approved', 'rejected')) DEFAULT 'pending',
    dat_submission_date TIMESTAMP WITH TIME ZONE,
    dat_response TEXT,
    here_api_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_purged_cities_city_state ON purged_cities(city, state_or_province);
CREATE INDEX IF NOT EXISTS idx_purged_cities_kma ON purged_cities(original_kma_code);
CREATE INDEX IF NOT EXISTS idx_purged_cities_purged_date ON purged_cities(purged_date);
CREATE INDEX IF NOT EXISTS idx_purged_cities_dat_status ON purged_cities(dat_submission_status);
CREATE INDEX IF NOT EXISTS idx_cities_here_verified ON cities(here_verified);

-- 4. Create verification_logs table for tracking HERE.com API calls
CREATE TABLE IF NOT EXISTS verification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    city TEXT NOT NULL,
    state_or_province TEXT NOT NULL,
    zip TEXT,
    verification_type TEXT CHECK (verification_type IN ('automatic', 'manual', 'batch')) DEFAULT 'automatic',
    here_api_success BOOLEAN NOT NULL,
    here_api_response TEXT,
    response_time_ms INTEGER,
    error_message TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_by TEXT, -- For manual verifications, track admin user
    original_kma_code TEXT
);

-- 5. Create index for verification logs
CREATE INDEX IF NOT EXISTS idx_verification_logs_city_state ON verification_logs(city, state_or_province);
CREATE INDEX IF NOT EXISTS idx_verification_logs_verified_at ON verification_logs(verified_at);
CREATE INDEX IF NOT EXISTS idx_verification_logs_success ON verification_logs(here_api_success);

-- 6. Add trigger to update updated_at timestamp on purged_cities
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_purged_cities_updated_at 
    BEFORE UPDATE ON purged_cities 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Create RLS policies for security
ALTER TABLE purged_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for admin operations)
CREATE POLICY "Service role full access on purged_cities" ON purged_cities
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on verification_logs" ON verification_logs
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read purged_cities (for admin interface)
CREATE POLICY "Authenticated users can read purged_cities" ON purged_cities
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read verification_logs" ON verification_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- 8. Create view for admin dashboard statistics
CREATE OR REPLACE VIEW purged_cities_stats AS
SELECT 
    COUNT(*) as total_purged,
    COUNT(*) FILTER (WHERE dat_submission_status = 'pending') as pending_submission,
    COUNT(*) FILTER (WHERE dat_submission_status = 'submitted') as submitted,
    COUNT(*) FILTER (WHERE dat_submission_status = 'approved') as approved,
    COUNT(*) FILTER (WHERE dat_submission_status = 'rejected') as rejected,
    COUNT(*) FILTER (WHERE purged_date >= NOW() - INTERVAL '7 days') as purged_this_week,
    COUNT(*) FILTER (WHERE purged_date >= NOW() - INTERVAL '30 days') as purged_this_month,
    COUNT(DISTINCT state_or_province) as affected_states,
    COUNT(DISTINCT original_kma_code) as affected_kma_codes,
    AVG(EXTRACT(EPOCH FROM (NOW() - purged_date))/86400) as avg_days_since_purge
FROM purged_cities;

-- 9. Create view for verification statistics
CREATE OR REPLACE VIEW verification_stats AS
SELECT 
    COUNT(*) as total_verifications,
    COUNT(*) FILTER (WHERE here_api_success = true) as successful_verifications,
    COUNT(*) FILTER (WHERE here_api_success = false) as failed_verifications,
    ROUND(
        (COUNT(*) FILTER (WHERE here_api_success = true)::DECIMAL / COUNT(*)) * 100, 2
    ) as success_rate_percentage,
    COUNT(*) FILTER (WHERE verified_at >= NOW() - INTERVAL '24 hours') as verifications_last_24h,
    COUNT(DISTINCT state_or_province) as states_verified,
    AVG(response_time_ms) as avg_response_time_ms,
    MAX(verified_at) as last_verification_at
FROM verification_logs;

-- Grant access to views
GRANT SELECT ON purged_cities_stats TO authenticated, service_role;
GRANT SELECT ON verification_stats TO authenticated, service_role;

-- 10. Comment the tables for documentation
COMMENT ON TABLE purged_cities IS 'Cities that failed HERE.com/DAT verification and were removed from active crawling';
COMMENT ON TABLE verification_logs IS 'Log of all HERE.com API verification attempts for audit and performance tracking';
COMMENT ON COLUMN purged_cities.purge_reason IS 'Reason why the city was purged (e.g., "City not found in HERE.com/DAT geocoding system")';
COMMENT ON COLUMN purged_cities.dat_submission_status IS 'Status of submission to DAT for review: pending, submitted, approved, rejected';
COMMENT ON COLUMN verification_logs.verification_type IS 'Type of verification: automatic (during crawl), manual (admin), batch (bulk operation)';
