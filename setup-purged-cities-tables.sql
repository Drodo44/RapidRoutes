-- Simple database setup script for creating purged cities system
-- Run this manually in Supabase SQL editor

-- 1. Add here_verified column to existing cities table (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cities' AND column_name = 'here_verified'
  ) THEN
    ALTER TABLE cities ADD COLUMN here_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

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

-- 3. Create verification_logs table
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
    verified_by TEXT,
    original_kma_code TEXT
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_purged_cities_city_state ON purged_cities(city, state_or_province);
CREATE INDEX IF NOT EXISTS idx_purged_cities_kma ON purged_cities(original_kma_code);
CREATE INDEX IF NOT EXISTS idx_purged_cities_purged_date ON purged_cities(purged_date);
CREATE INDEX IF NOT EXISTS idx_purged_cities_dat_status ON purged_cities(dat_submission_status);
CREATE INDEX IF NOT EXISTS idx_cities_here_verified ON cities(here_verified);
CREATE INDEX IF NOT EXISTS idx_verification_logs_city_state ON verification_logs(city, state_or_province);
CREATE INDEX IF NOT EXISTS idx_verification_logs_verified_at ON verification_logs(verified_at);
CREATE INDEX IF NOT EXISTS idx_verification_logs_success ON verification_logs(here_api_success);

-- 5. Enable RLS
ALTER TABLE purged_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
CREATE POLICY "Service role full access on purged_cities" ON purged_cities
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on verification_logs" ON verification_logs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated users can read purged_cities" ON purged_cities
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read verification_logs" ON verification_logs
    FOR SELECT USING (auth.role() = 'authenticated');
