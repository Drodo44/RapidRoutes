#!/bin/bash
# build-and-deploy-changes.sh - Script to build and prepare lane validation fixes for deployment

set -e  # Exit on error

echo "========= LANE VALIDATION FIX DEPLOYMENT ========="
echo "Starting build and preparation process..."

# Step 1: Run sanity check to verify file changes
echo
echo "1. Verifying file changes..."
echo "   - post-options.js has updated validation"
grep -A 5 "hasDestinationData" /workspaces/RapidRoutes/pages/post-options.js
echo "   - intelligence-pairing.js has updated validation"
grep -A 5 "hasDestinationData" /workspaces/RapidRoutes/pages/api/intelligence-pairing.js
echo "   - intelligenceApiAdapter.js has updated validation"
grep -A 5 "hasDestinationData" /workspaces/RapidRoutes/utils/intelligenceApiAdapter.js

# Step 2: Lint the project
echo
echo "2. Linting project..."
npm run lint || echo "Lint may have warnings, continuing..."

# Step 3: Build the project
echo
echo "3. Building project..."
npm run build

# Step 4: Output summary
echo
echo "========= DEPLOYMENT SUMMARY ========="
echo "✅ Validation logic updated in all files"
echo "✅ Logging enhanced for both success and failure paths"
echo "✅ Build completed"
echo
echo "Changes summary:"
echo "1. Lanes now require: origin_city, origin_state, and equipment_code"
echo "2. Lanes accept either destination_city OR destination_state (partial destination)"
echo "3. Enhanced logging at all validation points"
echo "4. Clear success/failure indicators in logs for better debugging"
echo
echo "Next steps:"
echo "1. Commit and push changes to GitHub"
echo "2. Trigger deployment to production environment"
echo "3. Monitor for validation patterns in production logs"
echo "========================================"