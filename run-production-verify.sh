#!/bin/bash
# Run production verification scripts with environment variables from .env.example

# Load environment variables from .env.example
export NEXT_PUBLIC_SUPABASE_URL="https://gwuhjxomavulwduhvgvi.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Mzk2MjksImV4cCI6MjA2NzUxNTYyOX0.fM8EeVag9MREyjBVv2asGpIgI_S7k_889kDDbE-8oUs"
export SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ"

echo "Running production verification scripts with environment variables set..."
echo "===================="

# Run verification script
echo "🚚 Running intelligence-api verification..."
node scripts/verify-intelligence-api.mjs

# Check if first script succeeded
if [ $? -ne 0 ]; then
  echo "❌ Intelligence API verification failed"
  exit 1
fi

# Run load test
echo "🔄 Running load test verification..."
node scripts/load-test-intelligence-api.mjs

# Check if second script succeeded
if [ $? -ne 0 ]; then
  echo "❌ Load test verification failed"
  exit 1
fi

echo "✅ All verification tests completed"