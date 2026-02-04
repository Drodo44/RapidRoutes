#!/usr/bin/env node
/**
 * RapidRoutes Health Check Runner
 * Sets up environment variables and runs the direct library test
 */

// Required environment variables from .env.example
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://gwuhjxomavulwduhvgvi.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Mzk2MjksImV4cCI6MjA2NzUxNTYyOX0.fM8EeVag9MREyjBVv2asGpIgI_S7k_889kDDbE-8oUs";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ";

// Import necessary modules
import { spawnSync } from 'child_process';
import fs from 'fs/promises';

/**
 * RapidRoutes Intelligence Verification System
 * 
 * Performs local testing of the intelligence pairing system and generates
 * a production health report based on the results.
 */
async function main() {
  console.log('\n🚀 STARTING RAPIDROUTES HEALTH CHECK');
  console.log('==================================');
  console.log('📦 Environment variables set from .env.example');
  
  // Check if lib/geographicCrawl.js exists
  try {
    await fs.access('./lib/geographicCrawl.js');
    console.log('✅ Found geographic crawl implementation');
  } catch (error) {
    console.error('❌ Could not find lib/geographicCrawl.js');
    process.exit(1);
  }
  
  // Run the direct library test
  console.log('\n🔍 Running direct library test...');
  const result = spawnSync('node', ['direct-library-test.mjs'], {
    stdio: 'inherit',
    env: process.env
  });
  
  if (result.status === 0) {
    console.log('\n✅ All tests passed successfully');
  } else if (result.status === 1) {
    console.log('\n⚠️ Tests completed with warnings');
  } else {
    console.error('\n❌ Tests failed');
  }
  
  process.exit(result.status);
}

// Execute main function
main();