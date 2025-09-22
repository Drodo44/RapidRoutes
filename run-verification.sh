#!/bin/bash
# RapidRoutes Verification Runner
# This script runs the verification process for the RapidRoutes intelligence-pairing API

echo "🔍 RapidRoutes Verification Runner"
echo "=================================="
echo ""

# Make sure the verification script is executable
chmod +x /workspaces/RapidRoutes/simulation-verification.mjs

# Run the verification script
echo "Running verification simulation..."
node /workspaces/RapidRoutes/simulation-verification.mjs

# Check if verification was successful
if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Verification completed successfully!"
  echo ""
  echo "Generated files:"
  echo "- simulation-verification-response.json: Raw API response data"
  echo "- FINAL_LANE_VERIFICATION_COMPLETE.md: Comprehensive verification report"
  echo ""
  echo "Next steps:"
  echo "1. Review the verification report"
  echo "2. Proceed with production deployment"
else
  echo ""
  echo "❌ Verification failed!"
  echo "Please check the error messages above for details."
fi