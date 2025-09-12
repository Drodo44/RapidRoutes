-- Create intelligence tracking table
CREATE TABLE IF NOT EXISTS intelligence_tracking (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for querying
  CONSTRAINT valid_type CHECK (type IN (
    'city_discovery',
    'kma_validation',
    'pair_generation',
    'city_enrichment',
    'database_update'
  ))
);