#!/bin/bash
# Script to clean up debug files that are not needed in production

echo "=== Cleaning Up Debug Files ==="

# Array of debug files to remove
DEBUG_FILES=(
  # Debug API page
  "pages/debug-api.js"
  # Debug scripts
  "scripts/test-parameter-formats.js"
  "scripts/test-adapter.js"
  "scripts/browser-console-test.js"
  "scripts/setup-api-debug.sh"
  # Debug API endpoint
  "pages/api/debug-intelligence-params.js"
)

# Track successful and failed removals
REMOVED=0
FAILED=0

# Remove each debug file
for file in "${DEBUG_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Removing $file..."
    rm "$file"
    if [ $? -eq 0 ]; then
      echo "✅ Removed $file"
      REMOVED=$((REMOVED+1))
    else
      echo "❌ Failed to remove $file"
      FAILED=$((FAILED+1))
    fi
  else
    echo "⚠️ File not found: $file"
    FAILED=$((FAILED+1))
  fi
done

echo ""
echo "=== Cleanup Summary ==="
echo "✅ Successfully removed $REMOVED files"
echo "❌ Failed to remove $FAILED files"

# Reset environment variables
echo ""
echo "=== Resetting Environment Variables ==="

# Check if .env file exists
if [ -f ".env" ]; then
  # Reset ALLOW_TEST_MODE
  if grep -q "ALLOW_TEST_MODE" .env; then
    sed -i 's/ALLOW_TEST_MODE=true/ALLOW_TEST_MODE=false/' .env
    echo "✅ Reset ALLOW_TEST_MODE=false in .env"
  fi
  
  # Reset NEXT_PUBLIC_ALLOW_TEST_MODE
  if grep -q "NEXT_PUBLIC_ALLOW_TEST_MODE" .env; then
    sed -i 's/NEXT_PUBLIC_ALLOW_TEST_MODE=true/NEXT_PUBLIC_ALLOW_TEST_MODE=false/' .env
    echo "✅ Reset NEXT_PUBLIC_ALLOW_TEST_MODE=false in .env"
  fi
else
  echo "⚠️ No .env file found"
fi

echo ""
echo "=== Final Steps ==="
echo "1. Commit the intelligenceApiAdapter.js implementation"
echo "2. Commit the updates to post-options.js and testAuthFlow.js"
echo "3. Verify that Generate Pairings works correctly"
echo "4. Submit a pull request for the debug-api-400-error branch"
echo ""
echo "Cleanup completed!"