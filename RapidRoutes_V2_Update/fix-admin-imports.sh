#!/bin/bash

# Fix Admin Supabase Imports
# This script updates all imports to use the server-only lib/supabaseAdmin.js

echo "🔧 Fixing Admin Supabase imports..."
echo ""

# Count files to update
echo "📊 Scanning for files to update..."
files_found=0

# Find all JS files that import from supabaseAdminClient or adminSupabase from supabaseClient
for file in $(find pages/api lib -name "*.js" -type f ! -name "*.bak" ! -name "*.backup"); do
  if grep -q "from.*supabaseAdminClient\|adminSupabase.*from.*supabaseClient" "$file" 2>/dev/null; then
    files_found=$((files_found + 1))
  fi
done

echo "   Found $files_found files to update"
echo ""

# Update all matching files
echo "🔄 Updating import statements..."
updated=0

for file in $(find pages/api lib -name "*.js" -type f ! -name "*.bak" ! -name "*.backup"); do
  if grep -q "from.*supabaseAdminClient\|adminSupabase.*from.*supabaseClient" "$file" 2>/dev/null; then
    echo "   Updating: $file"
    
    # Replace various import patterns with the new lib/supabaseAdmin import
    # Pattern 1: import { adminSupabase } from '../../../utils/supabaseAdminClient'
    sed -i "s|import { adminSupabase } from ['\"].*utils/supabaseAdminClient['\"].*;|import supabaseAdmin from '@/lib/supabaseAdmin';|g" "$file"
    
    # Pattern 2: import { adminSupabase as supabase } from '../../utils/supabaseAdminClient.js'
    sed -i "s|import { adminSupabase as supabase } from ['\"].*utils/supabaseAdminClient['\"].*|import supabaseAdmin from '@/lib/supabaseAdmin';\nconst supabase = supabaseAdmin;|g" "$file"
    
    # Pattern 3: import { adminSupabase } from '../utils/supabaseClient'
    sed -i "s|import { adminSupabase } from ['\"].*utils/supabaseClient['\"].*;|import supabaseAdmin from '@/lib/supabaseAdmin';|g" "$file"
    
    # Pattern 4: import { adminSupabase as supabase } from '../../utils/supabaseClient'
    sed -i "s|import { adminSupabase as supabase } from ['\"].*utils/supabaseClient['\"].*|import supabaseAdmin from '@/lib/supabaseAdmin';\nconst supabase = supabaseAdmin;|g" "$file"
    
    # Also need to replace variable names in the code
    # If they imported as 'adminSupabase', replace usage with 'supabaseAdmin'
    if grep -q "import.*adminSupabase.*from" "$file"; then
      # Only replace 'adminSupabase' that's not in import statements
      sed -i '/import.*from/!s/\badminSupabase\b/supabaseAdmin/g' "$file"
    fi
    
    updated=$((updated + 1))
  fi
done

echo ""
echo "✅ Updated $updated files"
echo ""

# Verify the changes
echo "🔍 Verifying updates..."
remaining=$(find pages/api lib -name "*.js" -type f ! -name "*.bak" ! -name "*.backup" -exec grep -l "from.*supabaseAdminClient\|adminSupabase.*from.*supabaseClient" {} \; 2>/dev/null | wc -l)

if [ "$remaining" -eq 0 ]; then
  echo "   ✅ All imports updated successfully!"
else
  echo "   ⚠️  Warning: $remaining files still have old imports"
  echo "   Files:"
  find pages/api lib -name "*.js" -type f ! -name "*.bak" ! -name "*.backup" -exec grep -l "from.*supabaseAdminClient\|adminSupabase.*from.*supabaseClient" {} \; 2>/dev/null
fi

echo ""
echo "📝 Summary:"
echo "   - Files scanned: $(find pages/api lib -name "*.js" -type f ! -name "*.bak" ! -name "*.backup" | wc -l)"
echo "   - Files found: $files_found"
echo "   - Files updated: $updated"
echo "   - Files remaining: $remaining"
echo ""
echo "🎯 Next steps:"
echo "   1. Review the changes with: git diff"
echo "   2. Test locally: npm run dev"
echo "   3. Verify no 'Missing SUPABASE_SERVICE_ROLE_KEY' errors"
echo "   4. Commit and deploy to Vercel"
