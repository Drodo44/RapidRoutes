#!/bin/bash

# Script to update all API routes to use the new supabaseAdmin.js file

echo "Updating API routes to use @/lib/supabaseAdmin..."

# Find all files that import from supabaseAdminClient or use getServerSupabase
files=$(grep -l "adminSupabase\|getServerSupabase" pages/api/**/*.js pages/api/*.js 2>/dev/null | sort -u)

count=0
for file in $files; do
  echo "Processing: $file"
  
  # Create backup
  cp "$file" "$file.bak"
  
  # Replace various import patterns
  sed -i 's|import { adminSupabase } from.*utils/supabaseAdminClient.*|import supabaseAdmin from "@/lib/supabaseAdmin";|g' "$file"
  sed -i 's|import { adminSupabase as supabase } from.*utils/supabaseAdminClient.*|import supabaseAdmin from "@/lib/supabaseAdmin";|g' "$file"
  sed -i 's|import { getServerSupabase } from.*lib/supabaseClient.*|import supabaseAdmin from "@/lib/supabaseAdmin";|g' "$file"
  
  # Replace usage patterns
  sed -i 's/const supabase = getServerSupabase();/const supabase = supabaseAdmin;/g' "$file"
  sed -i 's/const adminSupabase = getServerSupabase();/const adminSupabase = supabaseAdmin;/g' "$file"
  sed -i 's/\badinSupabase\b/supabaseAdmin/g' "$file"
  
  count=$((count + 1))
done

echo "Updated $count files"
echo "Backups saved with .bak extension"
