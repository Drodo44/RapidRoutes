-- Add population field if it doesn't exist
ALTER TABLE cities 
ADD COLUMN IF NOT EXISTS population INTEGER DEFAULT 0;

-- Create KMA adjacency table if it doesn't exist
CREATE TABLE IF NOT EXISTS kma_adjacency (
    id SERIAL PRIMARY KEY,
    kma_code VARCHAR(10) NOT NULL,
    adjacent_kma VARCHAR(10) NOT NULL,
    strength INTEGER DEFAULT 1, -- Higher number means stronger connection
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(kma_code, adjacent_kma)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_kma_adjacency_kma_code ON kma_adjacency(kma_code);
CREATE INDEX IF NOT EXISTS idx_kma_adjacency_adjacent_kma ON kma_adjacency(adjacent_kma);

-- Add some common KMA adjacencies (this is example data - we should expand this)
INSERT INTO kma_adjacency (kma_code, adjacent_kma, strength) 
VALUES 
    -- Georgia (Atlanta) adjacent markets
    ('GA_ATL', 'GA_SAV', 2),  -- Atlanta -> Savannah
    ('GA_ATL', 'TN_NSH', 2),  -- Atlanta -> Nashville
    ('GA_ATL', 'AL_BHM', 2),  -- Atlanta -> Birmingham
    ('GA_ATL', 'SC_CAE', 2),  -- Atlanta -> Columbia
    ('GA_ATL', 'NC_CLT', 2),  -- Atlanta -> Charlotte
    
    -- Florida (Miami) adjacent markets
    ('FL_MIA', 'FL_ORL', 2),  -- Miami -> Orlando
    ('FL_MIA', 'FL_TPA', 2),  -- Miami -> Tampa
    ('FL_MIA', 'FL_JAX', 2),  -- Miami -> Jacksonville
    
    -- Illinois (Chicago) adjacent markets
    ('IL_CHI', 'WI_MKE', 2),  -- Chicago -> Milwaukee
    ('IL_CHI', 'IN_IND', 2),  -- Chicago -> Indianapolis
    ('IL_CHI', 'MI_DET', 2),  -- Chicago -> Detroit
    
    -- New York adjacent markets
    ('NY_NYC', 'NJ_NYC', 2),  -- NYC -> Northern NJ
    ('NY_NYC', 'CT_BDR', 2),  -- NYC -> Bridgeport
    ('NY_NYC', 'PA_ABE', 2),  -- NYC -> Allentown
    
    -- Add reciprocal relationships
    ('GA_SAV', 'GA_ATL', 2),
    ('TN_NSH', 'GA_ATL', 2),
    ('AL_BHM', 'GA_ATL', 2),
    ('SC_CAE', 'GA_ATL', 2),
    ('NC_CLT', 'GA_ATL', 2),
    
    ('FL_ORL', 'FL_MIA', 2),
    ('FL_TPA', 'FL_MIA', 2),
    ('FL_JAX', 'FL_MIA', 2),
    
    ('WI_MKE', 'IL_CHI', 2),
    ('IN_IND', 'IL_CHI', 2),
    ('MI_DET', 'IL_CHI', 2),
    
    ('NJ_NYC', 'NY_NYC', 2),
    ('CT_BDR', 'NY_NYC', 2),
    ('PA_ABE', 'NY_NYC', 2)
ON CONFLICT (kma_code, adjacent_kma) DO NOTHING;

-- Create an index on cities.kma_code if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_cities_kma_code ON cities(kma_code);

-- Add verification tracking
CREATE TABLE IF NOT EXISTS city_verifications (
    id SERIAL PRIMARY KEY,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    zip VARCHAR(10),
    verified BOOLEAN DEFAULT false,
    last_verified TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(city, state, zip)
);

-- Add index for city verification lookups
CREATE INDEX IF NOT EXISTS idx_city_verifications_lookup 
ON city_verifications(city, state, zip);
