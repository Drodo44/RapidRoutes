#!/bin/bash
# setup-staging.sh

echo "Setting up staging environment..."

# Create staging schema
echo "Creating staging schema via Supabase..."

# Use Supabase CLI or direct connection
if [ -z "$SUPABASE_URL" ]; then
    echo "Error: SUPABASE_URL not set"
    exit 1
fi

# Create schema using Supabase connection
supabase sql <<EOF
CREATE SCHEMA IF NOT EXISTS staging;

-- Clone tables structure to staging
CREATE TABLE IF NOT EXISTS staging.lanes (LIKE public.lanes INCLUDING ALL);
CREATE TABLE IF NOT EXISTS staging.cities (LIKE public.cities INCLUDING ALL);
CREATE TABLE IF NOT EXISTS staging.recaps (LIKE public.recaps INCLUDING ALL);
CREATE TABLE IF NOT EXISTS staging.reference_numbers (LIKE public.reference_numbers INCLUDING ALL);

-- Sample data
INSERT INTO staging.lanes 
SELECT * FROM public.lanes 
WHERE created_at >= NOW() - INTERVAL '7 days' 
LIMIT 100;

INSERT INTO staging.cities 
SELECT * FROM public.cities 
WHERE id IN (
    SELECT DISTINCT origin_city_id FROM staging.lanes 
    UNION 
    SELECT DISTINCT dest_city_id FROM staging.lanes
);
EOF

# Set up environment variables
cat > .env.staging << EOF
SUPABASE_URL=$STAGING_SUPABASE_URL
SUPABASE_KEY=$STAGING_SUPABASE_KEY
DATABASE_SCHEMA=staging
NODE_ENV=staging
EOF

echo "Staging environment setup complete!"
