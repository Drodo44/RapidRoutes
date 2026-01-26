#!/usr/bin/env node
/**
 * RapidRoutes Production Load Test Script
 * This script uses the existing code but adds temporary environment variables
 * for testing in the GitHub Codespace environment.
 */

// Set temporary environment variables for testing
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://vywvmhdyyhkdpmbfzkgx.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5d3ZtaGR5eWhrZHBtYmZ6a2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDQyODM0NjYsImV4cCI6MTk1OTg1OTQ2Nn0.qmV_y7I_tHHWJYEm1uFJWLXy-VM1JPVTr8I0JVXmzbQ";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5d3ZtaGR5eWhrZHBtYmZ6a2d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY0NDI4MzQ2NiwiZXhwIjoxOTU5ODU5NDY2fQ.mWv-ZkKdY06stDFGNyuFYCxzQwkXQj1hp94sNb8VGas";

// Import and run the load test script via execSync
import { execSync } from 'child_process';

console.log('Running RapidRoutes Intelligence API Load Test...');
try {
  const output = execSync('node scripts/load-test-intelligence-api.mjs', { 
    env: process.env,
    stdio: 'inherit'
  });
} catch (error) {
  console.error('Load test failed with error:', error.message);
  process.exit(1);
}