#!/bin/bash
# This script runs a quick test of the intelligence-pairing API endpoint

echo "🚀 Starting Next.js development server..."
npm run dev &
DEV_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 10

echo "🧪 Running verification script..."
node verify-intelligence-api.js

# Cleanup
echo "🧹 Cleaning up..."
kill $DEV_PID

echo "✅ Done!"