-- migrations/005-enhanced-constraints.sql

-- Add constraints to lanes table
ALTER TABLE lanes
ADD CONSTRAINT check_weight_limits 
CHECK (
  CASE 
    WHEN randomize_weight = true THEN
      weight_min >= 1000 AND weight_max <= 50000 AND weight_min < weight_max
    ELSE
      weight_lbs >= 1000 AND weight_lbs <= 50000
  END
);

ALTER TABLE lanes
ADD CONSTRAINT check_pickup_dates
CHECK (
  CASE 
    WHEN pickup_latest IS NOT NULL THEN
      pickup_latest >= pickup_earliest
    ELSE true
  END
);

ALTER TABLE lanes
ADD CONSTRAINT check_length
CHECK (length_ft > 0 AND length_ft <= 53);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lanes_status ON lanes(lane_status) WHERE lane_status IN ('current', 'archive');
CREATE INDEX IF NOT EXISTS idx_lanes_created_by ON lanes(created_by);
CREATE INDEX IF NOT EXISTS idx_lanes_equipment ON lanes(equipment_code);

-- Add constraints to cities table
ALTER TABLE cities
ADD CONSTRAINT check_coordinates
CHECK (
  latitude >= -90 AND latitude <= 90 AND
  longitude >= -180 AND longitude <= 180
);

-- Add constraint for valid state codes
ALTER TABLE cities
ADD CONSTRAINT check_state_format
CHECK (state_or_province ~ '^[A-Z]{2}$');

-- Add constraint for valid ZIP codes
ALTER TABLE cities
ADD CONSTRAINT check_zip_format
CHECK (zip ~ '^\d{5}(-\d{4})?$');

-- Add indexes for city lookups
CREATE INDEX IF NOT EXISTS idx_cities_location ON cities(city, state_or_province);
CREATE INDEX IF NOT EXISTS idx_cities_zip ON cities(zip);

-- Add foreign key constraints
ALTER TABLE lanes
ADD CONSTRAINT fk_equipment
FOREIGN KEY (equipment_code)
REFERENCES equipment_codes(code)
ON DELETE RESTRICT;
