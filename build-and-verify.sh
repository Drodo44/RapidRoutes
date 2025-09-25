#!/bin/bash
# build-and-verify.sh - Script to build and verify lane destination field fixes

set -e  # Exit on error

echo "========= LANE DESTINATION FIELD FIX VERIFICATION ========="
echo "Starting build and verification process..."

# Step 1: Run the test to verify field mapping
echo
echo "1. Running destination field mapping test..."
npm test -- destination-field-mapping.test.js

# Step 2: Build the project
echo
echo "2. Building project..."
npm run build

# Step 3: Run the backfill script (assuming supabase CLI is available)
echo
echo "3. Running backfill script..."
echo "   Note: This would typically be run in production via:"
echo "   supabase db execute --file ./migrations/backfill-destination-fields.sql"

# Step 4: Output summary
echo
echo "========= VERIFICATION SUMMARY ========="
echo "✅ Field mapping tests completed"
echo "✅ Build completed"
echo "✅ Backfill script ready for execution"
echo
echo "Next steps:"
echo "1. Deploy the changes"
echo "2. Run the backfill script in production"
echo "3. Monitor for any destination field issues in logs"
echo "========================================"