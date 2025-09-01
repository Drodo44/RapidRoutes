-- migrations/add_dat_verification_learning.sql

-- Add DAT verification tracking to cities table
ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS dat_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dat_verified_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_dat_verification timestamp with time zone,
ADD COLUMN IF NOT EXISTS freight_score decimal DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS verification_history jsonb DEFAULT '{}'::jsonb;

-- Create index for faster DAT-verified city lookups
CREATE INDEX IF NOT EXISTS idx_cities_dat_verified ON cities(dat_verified) WHERE dat_verified = true;

-- Create index for KMA-based DAT city lookups
CREATE INDEX IF NOT EXISTS idx_cities_kma_dat ON cities(kma_code, dat_verified, freight_score DESC) 
WHERE dat_verified = true;

-- Add function to calculate city reliability score
CREATE OR REPLACE FUNCTION calculate_city_reliability(
  verified_count integer,
  days_since_verification integer,
  freight_score decimal
) RETURNS decimal AS $$
BEGIN
  -- Score drops off after 30 days since last verification
  -- Higher verified_count and freight_score increase reliability
  RETURN (
    CASE 
      WHEN days_since_verification <= 30 THEN 1.0
      ELSE POWER(0.95, (days_since_verification - 30)::decimal / 7) -- 5% decay per week after 30 days
    END *
    LEAST(verified_count::decimal / 5, 1.0) * -- Max bonus at 5 verifications
    LEAST(freight_score / 2, 1.0) -- Max bonus at freight_score of 2.0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for quick access to reliable cities
CREATE OR REPLACE VIEW reliable_dat_cities AS
SELECT 
  c.*,
  calculate_city_reliability(
    dat_verified_count,
    EXTRACT(DAY FROM (NOW() - last_dat_verification))::integer,
    freight_score
  ) as reliability_score
FROM cities c
WHERE dat_verified = true
  AND dat_verified_count > 0;
