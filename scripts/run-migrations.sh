#!/bin/bash

# Check if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    exit 1
fi

# Function to run a migration file
run_migration() {
    local file=$1
    echo "Running migration: $file"
    PGPASSWORD=$SUPABASE_SERVICE_ROLE_KEY psql -h $(echo $SUPABASE_URL | cut -d'/' -f3) \
        -U postgres \
        -f $file
}

# Run all migration files in order
for file in migrations/*.sql; do
    run_migration $file
done

echo "Migrations completed"
