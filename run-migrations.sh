#!/bin/bash
# =============================================================================
# RUN DATABASE MIGRATIONS FOR ENTERPRISE CITY PRE-COMPUTATION
# =============================================================================
# This script executes the SQL migrations to set up the nearby cities system.
# 
# Usage: ./run-migrations.sh
# 
# Note: Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
# =============================================================================

set -e

echo "🚀 Starting RapidRoutes Enterprise Database Migration"
echo "=================================================="

# Check for required environment variables
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found"
  exit 1
fi

source .env.local

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: Missing required environment variables"
  echo "   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Extract database connection details
DB_HOST=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's|https://||' | sed 's|http://||' | cut -d'/' -f1)
DB_NAME="postgres"
DB_USER="postgres"
DB_PASSWORD="$SUPABASE_SERVICE_ROLE_KEY"

echo "📊 Migration 1: Add nearby_cities column to cities table"
echo "   This will take ~15-20 minutes for 30,000+ cities..."
echo ""

# You'll need to run these manually in Supabase SQL Editor
# because they require PostGIS and take a long time

echo "⚠️  MANUAL STEPS REQUIRED:"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql"
echo ""
echo "2. Copy and paste the contents of:"
echo "   sql/01_add_nearby_cities.sql"
echo ""
echo "3. Click 'Run' and wait ~15-20 minutes"
echo ""
echo "4. Then copy and paste:"
echo "   sql/02_lane_city_choices.sql"
echo ""
echo "5. Click 'Run'"
echo ""
echo "=================================================="
echo ""
echo "💡 TIP: You can monitor progress in the Supabase logs."
echo "   The script will output progress messages as it processes batches."
echo ""
