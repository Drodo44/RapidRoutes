-- /db/migrations/create_monitoring_tables.sql

-- Operation logs for performance tracking
CREATE TABLE IF NOT EXISTS operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation_id TEXT NOT NULL,
    duration_ms INTEGER NOT NULL,
    environment TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS operation_logs_timestamp_idx ON operation_logs (timestamp);
CREATE INDEX IF NOT EXISTS operation_logs_duration_idx ON operation_logs (duration_ms);

-- Error logs for problem tracking
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_type TEXT NOT NULL,
    context TEXT NOT NULL,
    severity TEXT NOT NULL,
    environment TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS error_logs_timestamp_idx ON error_logs (timestamp);
CREATE INDEX IF NOT EXISTS error_logs_severity_idx ON error_logs (severity);

-- System health tracking
CREATE TABLE IF NOT EXISTS system_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    database BOOLEAN NOT NULL,
    api_services BOOLEAN NOT NULL,
    memory JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS system_health_timestamp_idx ON system_health (timestamp);

-- Simple health check table
CREATE TABLE IF NOT EXISTS health_checks (
    id SERIAL PRIMARY KEY,
    count INTEGER DEFAULT 1
);

-- Insert initial health check record if none exists
INSERT INTO health_checks (count) 
SELECT 1 
WHERE NOT EXISTS (SELECT 1 FROM health_checks);

-- Create monitoring specific RLS policies
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs
CREATE POLICY "Allow authenticated inserts on operation_logs"
    ON operation_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated inserts on error_logs"
    ON error_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated inserts on system_health"
    ON system_health FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to read logs
CREATE POLICY "Allow authenticated reads on operation_logs"
    ON operation_logs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated reads on error_logs"
    ON error_logs FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated reads on system_health"
    ON system_health FOR SELECT
    TO authenticated
    USING (true);
