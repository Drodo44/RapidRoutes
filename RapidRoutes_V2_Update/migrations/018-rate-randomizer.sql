ALTER TABLE lanes 
ADD COLUMN IF NOT EXISTS randomize_rate boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rate_min numeric,
ADD COLUMN IF NOT EXISTS rate_max numeric;
