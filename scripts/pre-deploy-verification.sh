#!/bin/bash
# pre-deploy-verification.sh
# 
# Pre-deployment verification script for RapidRoutes
# Checks critical aspects of the application before deployment
#
# Usage: ./pre-deploy-verification.sh

set -e  # Exit immediately if a command fails

echo "🔍 RapidRoutes Pre-Deployment Verification"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check success
check_success() {
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ $1${NC}"
  else
    echo -e "${RED}❌ $1${NC}"
    exit 1
  fi
}

# Check if required env variables exist
check_env_vars() {
  local missing=0
  
  # Required env variables for production
  required_vars=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "HERE_API_KEY"
  )
  
  echo "📋 Checking environment variables..."
  
  for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
      echo -e "${RED}❌ Missing required env variable: ${var}${NC}"
      missing=$((missing + 1))
    else
      echo -e "${GREEN}✓ ${var} is set${NC}"
    fi
  done
  
  if [ $missing -gt 0 ]; then
    echo -e "${RED}❌ ${missing} required environment variables are missing!${NC}"
    exit 1
  else
    echo -e "${GREEN}✅ All required environment variables are set${NC}"
  fi
}

# Run ESLint to check for code issues
run_eslint() {
  echo "🧹 Running ESLint..."
  
  if npx eslint --quiet --max-warnings=0 . &> /dev/null; then
    echo -e "${GREEN}✅ ESLint passed${NC}"
  else
    echo -e "${RED}❌ ESLint found code issues${NC}"
    # Show a more detailed report
    npx eslint .
    exit 1
  fi
}

# Build the application
run_build() {
  echo "🏗️ Testing production build..."
  
  if npm run build &> build.log; then
    echo -e "${GREEN}✅ Build successful${NC}"
  else
    echo -e "${RED}❌ Build failed! See errors below:${NC}"
    cat build.log
    rm -f build.log
    exit 1
  fi
  
  rm -f build.log
}

# Check bundle sizes
check_bundle_sizes() {
  echo "📦 Analyzing bundle sizes..."
  
  # Run bundle analyzer in silent mode and parse output
  npm run analyze &> bundle.log
  
  # Extract total size from the log
  total_size=$(grep -o "Total size: [0-9.]* KB" bundle.log | awk '{print $3}')
  
  if [ -z "$total_size" ]; then
    echo -e "${YELLOW}⚠️ Could not determine bundle size${NC}"
  else
    if (( $(echo "$total_size > 300" | bc -l) )); then
      echo -e "${YELLOW}⚠️ Bundle is large: ${total_size} KB${NC}"
    else
      echo -e "${GREEN}✅ Bundle size is acceptable: ${total_size} KB${NC}"
    fi
  fi
  
  rm -f bundle.log
}

# Check critical files existence
check_critical_files() {
  echo "📋 Checking critical files..."
  
  critical_files=(
    "next.config.js"
    "middleware.js"
    "lib/datCsvBuilder.js"
    "lib/datHeaders.js"
    "components/ErrorBoundary.js"
    "pages/api/healthcheck.js"
    "middleware/authMiddleware.js"
  )
  
  missing=0
  
  for file in "${critical_files[@]}"; do
    if [ ! -f "$file" ]; then
      echo -e "${RED}❌ Critical file missing: ${file}${NC}"
      missing=$((missing + 1))
    fi
  done
  
  if [ $missing -gt 0 ]; then
    echo -e "${RED}❌ ${missing} critical files are missing!${NC}"
    exit 1
  else
    echo -e "${GREEN}✅ All critical files present${NC}"
  fi
}

# Run all checks
main() {
  check_env_vars
  check_critical_files
  run_eslint
  run_build
  check_bundle_sizes
  
  echo ""
  echo -e "${GREEN}✅ All verification checks passed!${NC}"
  echo "The application is ready for deployment."
}

main