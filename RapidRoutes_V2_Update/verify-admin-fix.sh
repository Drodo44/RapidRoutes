#!/bin/bash

# Verify Supabase Admin Fix
# Quick verification that the fix was applied correctly

echo "🔍 Verifying Supabase Admin Client Fix"
echo "========================================"
echo ""

# Check 1: lib/supabaseAdmin.js exists
echo "✓ Check 1: Server-only admin file exists"
if [ -f "lib/supabaseAdmin.js" ]; then
  echo "  ✅ lib/supabaseAdmin.js exists"
else
  echo "  ❌ lib/supabaseAdmin.js NOT FOUND"
  exit 1
fi

# Check 2: No old imports in API routes
echo ""
echo "✓ Check 2: API routes use new import pattern"
old_imports=$(find pages/api -name "*.js" -type f ! -name "*.bak" -exec grep -l "from.*supabaseAdminClient" {} \; 2>/dev/null | wc -l)
if [ "$old_imports" -eq 0 ]; then
  echo "  ✅ No old imports found in API routes"
else
  echo "  ❌ Found $old_imports API files with old imports"
  find pages/api -name "*.js" -type f ! -name "*.bak" -exec grep -l "from.*supabaseAdminClient" {} \; 2>/dev/null
  exit 1
fi

# Check 3: No old imports in lib files
echo ""
echo "✓ Check 3: Library files use new import pattern"
old_lib_imports=$(find lib -name "*.js" -type f ! -name "*.bak" -exec grep -l "from.*supabaseAdminClient" {} \; 2>/dev/null | wc -l)
if [ "$old_lib_imports" -eq 0 ]; then
  echo "  ✅ No old imports found in lib files"
else
  echo "  ❌ Found $old_lib_imports lib files with old imports"
  find lib -name "*.js" -type f ! -name "*.bak" -exec grep -l "from.*supabaseAdminClient" {} \; 2>/dev/null
  exit 1
fi

# Check 4: No admin client imports in client-side code
echo ""
echo "✓ Check 4: No admin client in client-side code"
client_imports=0

if [ -d "components" ]; then
  components_count=$(find components -name "*.js" -o -name "*.jsx" 2>/dev/null | xargs grep -l "supabaseAdmin\|lib/supabaseAdmin" 2>/dev/null | wc -l)
  client_imports=$((client_imports + components_count))
fi

if [ -d "hooks" ]; then
  hooks_count=$(find hooks -name "*.js" -o -name "*.jsx" 2>/dev/null | xargs grep -l "supabaseAdmin\|lib/supabaseAdmin" 2>/dev/null | wc -l)
  client_imports=$((client_imports + hooks_count))
fi

pages_count=$(find pages -name "*.js" -path "*/pages/*" ! -path "*/pages/api/*" 2>/dev/null | xargs grep -l "supabaseAdmin\|lib/supabaseAdmin" 2>/dev/null | wc -l)
client_imports=$((client_imports + pages_count))

if [ "$client_imports" -eq 0 ]; then
  echo "  ✅ No admin client imports in client-side code"
else
  echo "  ❌ Found $client_imports client-side files importing admin client"
  echo "  This is a SECURITY ISSUE - admin client should only be imported in API routes"
  exit 1
fi

# Check 5: Environment variables present (local check only)
echo ""
echo "✓ Check 5: Environment variables (local)"
if [ -f ".env.local" ]; then
  if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local && grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
    echo "  ✅ Required env vars found in .env.local"
  else
    echo "  ⚠️  Some env vars missing in .env.local"
    echo "     (This is OK if running in production with Vercel env vars)"
  fi
else
  echo "  ⚠️  No .env.local file found"
  echo "     (This is OK if running in production with Vercel env vars)"
fi

# Summary
echo ""
echo "========================================"
echo "✅ All verification checks passed!"
echo ""
echo "Next steps:"
echo "1. Test locally: npm run dev"
echo "2. Test API endpoint: curl http://localhost:3000/api/analytics/summary"
echo "3. Deploy to Vercel: git push origin main"
echo "4. Verify production: Check Vercel deployment logs"
echo ""
echo "Documentation: SUPABASE_ADMIN_FIX.md"
