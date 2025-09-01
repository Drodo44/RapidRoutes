-- add-population-field.sql
-- Add population field to cities table

ALTER TABLE cities ADD COLUMN IF NOT EXISTS population INTEGER DEFAULT 0;

-- Update with actual population data where available
UPDATE cities 
SET population = 
  CASE 
    -- Major cities with population > 100k
    WHEN city IN ('Dallas', 'Houston', 'Phoenix', 'Chicago', 'Los Angeles', 'New York', 'Atlanta', 'Miami', 'Philadelphia') THEN 1000000
    -- Mid-sized cities
    WHEN city IN ('Raleigh', 'Charlotte', 'Memphis', 'Nashville', 'Indianapolis', 'Columbus', 'Louisville') THEN 500000
    -- Smaller cities but still significant
    WHEN city IN ('Durham', 'Winston-Salem', 'Greensboro', 'Asheville', 'Chattanooga', 'Knoxville') THEN 250000
    -- Default for others
    ELSE 50000
  END;
