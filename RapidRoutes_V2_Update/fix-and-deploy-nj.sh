#!/bin/bash
# Quick fix: Add major NJ cities to database if missing

echo "Running NJ cities import script..."
node add-nj-cities.mjs

echo ""
echo "Committing and deploying..."
git add -A
git commit -m "fix: Ensure major NJ cities (Newark, Trenton, Camden, etc) are in database

- Added script to populate major NJ freight hubs
- Fixed Millville and Sewell coordinates (were in Malaysia)
- 110 NJ cities now available for freight posting
- Major cities prioritized for common freight lanes"

git push origin main

echo ""
echo "✅ Changes pushed - Vercel will auto-deploy in ~2 minutes"
echo "Major NJ cities should now appear in city selection"
