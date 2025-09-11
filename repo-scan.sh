#!/bin/bash
# repo-scan.sh - Comprehensive repository health scan

echo "🔍 COMPREHENSIVE REPOSITORY SCAN"
echo "=================================="

echo ""
echo "1️⃣ DUPLICATE DEBUG LOGGING"
echo "   (Looking for excessive console.log statements)"
total_debug=$(find . -name "*.js" -not -path "./node_modules/*" -exec grep -l "console\." {} \; | wc -l)
echo "   Files with console statements: $total_debug"

echo ""
echo "2️⃣ MISSING ERROR HANDLING"
echo "   (API routes without try/catch)"
api_files=$(find ./pages/api -name "*.js" | wc -l)
api_with_catch=$(find ./pages/api -name "*.js" -exec grep -l "catch" {} \; | wc -l)
echo "   API files total: $api_files"
echo "   API files with error handling: $api_with_catch"
echo "   Missing error handling: $((api_files - api_with_catch))"

echo ""
echo "3️⃣ AUTHENTICATION CONSISTENCY"
echo "   (Checking auth middleware usage)"
auth_middleware_files=$(find ./pages/api -name "*.js" -exec grep -l "validateApiAuth\|auth\.unified" {} \; | wc -l)
echo "   API files using auth middleware: $auth_middleware_files"

echo ""
echo "4️⃣ INTELLIGENCE SYSTEM INTEGRITY"
echo "   (Verifying core intelligence files exist)"
intelligence_files=(
  "./lib/FreightIntelligence.js"
  "./lib/intelligentCache.js"
  "./lib/geographicCrawl.js"
  "./lib/datCsvBuilder.js"
)

for file in "${intelligence_files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ MISSING: $file"
  fi
done

echo ""
echo "5️⃣ DUPLICATE FILES"
echo "   (Looking for backup/temp files that might cause conflicts)"
find . -name "*_backup*" -o -name "*_fixed*" -o -name "*_temp*" -o -name "*~" -not -path "./node_modules/*" | head -10

echo ""
echo "6️⃣ ENVIRONMENT VARIABLE DEPENDENCIES"
echo "   (Files that might fail without proper env vars)"
env_dependent=$(find . -name "*.js" -not -path "./node_modules/*" -exec grep -l "process\.env\." {} \; | wc -l)
echo "   Files using environment variables: $env_dependent"

echo ""
echo "7️⃣ POTENTIAL SECURITY ISSUES"
echo "   (Looking for unsafe patterns)"
find . -name "*.js" -not -path "./node_modules/*" -exec grep -l "eval\|innerHTML\|dangerouslySetInnerHTML" {} \; | head -5

echo ""
echo "8️⃣ UNUSED IMPORTS"
echo "   (Files that might have unused dependencies)"
find . -name "*.js" -not -path "./node_modules/*" -exec grep -l "import.*{.*}.*from" {} \; | head -5

echo ""
echo "Scan complete! 🔍"