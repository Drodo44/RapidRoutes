#!/bin/bash
# Build and deploy script for validation changes

echo "🔄 Building Next.js project..."
cd /workspaces/RapidRoutes
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "📝 Validation changes summary:"
    echo "  - Updated lane validation in post-options.js, intelligence-pairing.js, and intelligenceApiAdapter.js"
    echo "  - Lanes now require: origin_city, origin_state, equipment_code"
    echo "  - Lanes now accept EITHER destination_city OR destination_state (not both required)"
    echo "  - Enhanced logging for validation success/failure"
    echo ""
    echo "Ready for deployment! Push changes to main branch to deploy to production."
else
    echo "❌ Build failed! Please check the logs above for errors."
    exit 1
fi
