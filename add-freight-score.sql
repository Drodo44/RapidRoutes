-- Add freight intelligence columns
ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS freight_score float DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS dat_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dat_verified_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_dat_verification timestamptz,
ADD COLUMN IF NOT EXISTS verification_history jsonb;
