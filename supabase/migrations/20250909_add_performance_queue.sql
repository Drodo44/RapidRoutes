-- Migration: add performance_queue table to temporarily store telemetry when lane_performance is unavailable
CREATE TABLE IF NOT EXISTS performance_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payload JSONB NOT NULL,
  attempts INT DEFAULT 0,
  processed BOOLEAN DEFAULT FALSE,
  last_error TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- index to find pending records quickly
CREATE INDEX IF NOT EXISTS idx_performance_queue_processed ON performance_queue(processed, created_at);
