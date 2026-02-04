-- Upgrade cities table with new fields
ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS here_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS here_data JSONB,
ADD COLUMN IF NOT EXISTS discovered_by VARCHAR(50),
ADD COLUMN IF NOT EXISTS discovery_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_verification TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS kma_confidence FLOAT,
ADD COLUMN IF NOT EXISTS kma_assignment_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS kma_assignment_metadata JSONB,
ADD COLUMN IF NOT EXISTS merged_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS merged_ids INTEGER[],
ADD COLUMN IF NOT EXISTS last_merged TIMESTAMPTZ;

-- Create archived_cities table for cleanup operations
CREATE TABLE IF NOT EXISTS archived_cities (
  id SERIAL PRIMARY KEY,
  city VARCHAR(255) NOT NULL,
  state_or_province VARCHAR(255) NOT NULL,
  zip VARCHAR(10),
  latitude FLOAT,
  longitude FLOAT,
  kma_code VARCHAR(50),
  kma_name VARCHAR(255),
  here_verified BOOLEAN,
  here_data JSONB,
  archived_reason VARCHAR(50),
  archived_at TIMESTAMPTZ NOT NULL,
  primary_city_id INTEGER REFERENCES cities(id),
  original_data JSONB
);

-- Create operation_logs table for monitoring
CREATE TABLE IF NOT EXISTS operation_logs (
  id SERIAL PRIMARY KEY,
  operation_type VARCHAR(50) NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  duration INTEGER, -- in milliseconds
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);

-- Create verification_logs table
CREATE TABLE IF NOT EXISTS verification_logs (
  id SERIAL PRIMARY KEY,
  city VARCHAR(255) NOT NULL,
  state_or_province VARCHAR(255) NOT NULL,
  zip VARCHAR(10),
  verification_type VARCHAR(50) NOT NULL,
  here_api_success BOOLEAN,
  here_api_response JSONB,
  response_time_ms INTEGER,
  error_message TEXT,
  verified_by VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_cities_here_verified ON cities(here_verified);
CREATE INDEX IF NOT EXISTS idx_cities_kma_confidence ON cities(kma_confidence);
CREATE INDEX IF NOT EXISTS idx_cities_last_verification ON cities(last_verification);
CREATE INDEX IF NOT EXISTS idx_operation_logs_type ON operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_verification_logs_city_state ON verification_logs(city, state_or_province);

-- Add spatial index for city coordinates
CREATE INDEX IF NOT EXISTS idx_cities_coordinates ON cities USING gist (
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
);
