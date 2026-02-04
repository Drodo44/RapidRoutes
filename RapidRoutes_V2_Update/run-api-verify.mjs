#!/usr/bin/env node
/**
 * Production environment variables wrapper for verification script
 */

// Set environment variables for production testing
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://vywvmhdyyhkdpmbfzkgx.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5d3ZtaGR5eWhrZHBtYmZ6a2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDQyODM0NjYsImV4cCI6MTk1OTg1OTQ2Nn0.qmV_y7I_tHHWJYEm1uFJWLXy-VM1JPVTr8I0JVXmzbQ";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5d3ZtaGR5eWhrZHBtYmZ6a2d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NDI4MzQ2NiwiZXhwIjoxOTU5ODU5NDY2fQ.mWv-ZkKdY06stDFGNyuFYCxzQwkXQj1hp94sNb8VGas";

// Run verification script directly using spawnSync to capture output
import { spawnSync } from 'child_process';

console.log('🚀 Running RapidRoutes API verification script...');

const result = spawnSync('node', ['scripts/verify-intelligence-api.mjs'], { 
  env: process.env,
  stdio: 'inherit',
  encoding: 'utf-8'
});

if (result.status !== 0) {
  console.error(`❌ Verification failed with code ${result.status}`);
  process.exit(result.status);
}