#!/usr/bin/env node
/**
 * RapidRoutes Comprehensive Health Check
 * Runs all verification tests and generates a production health report
 */

import { spawnSync } from 'child_process';
import fs from 'fs/promises';

// Set up environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://gwuhjxomavulwduhvgvi.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5Mzk2MjksImV4cCI6MjA2NzUxNTYyOX0.fM8EeVag9MREyjBVv2asGpIgI_S7k_889kDDbE-8oUs";
process.env.SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ";

// Define check types
const CHECK_TYPES = {
  INTELLIGENCE: { 
    name: 'Intelligence System',
    script: './direct-library-test.mjs'
  },
  SECURITY: {
    name: 'Security Check', 
    script: './check-debug-endpoints.mjs'
  }
};

// Run a check and capture the result
async function runCheck(check) {
  console.log(`\n🚀 Running ${check.name} Check...`);
  console.log('='.repeat(check.name.length + 18));
  
  const result = spawnSync('node', [check.script], {
    stdio: 'inherit',
    env: process.env
  });
  
  return {
    name: check.name,
    success: result.status === 0,
    warning: result.status === 1,
    error: result.status > 1,
    exitCode: result.status
  };
}

// Generate final summary
async function generateSummary(results) {
  let allPassing = true;
  let hasWarnings = false;
  
  for (const result of results) {
    if (result.error) {
      allPassing = false;
    }
    if (result.warning) {
      hasWarnings = true;
    }
  }
  
  // Create summary content
  let status = '✅ HEALTHY';
  if (!allPassing) {
    status = '❌ CRITICAL ISSUES';
  } else if (hasWarnings) {
    status = '⚠️ WARNINGS';
  }
  
  // Add a timestamp to the report file
  const reportPath = '/workspaces/RapidRoutes/PRODUCTION_HEALTH.md';
  const report = await fs.readFile(reportPath, 'utf8');
  
  const updatedReport = report.replace(
    /# RapidRoutes Production Health Report\n/,
    `# RapidRoutes Production Health Report\n\n**Status:** ${status}\n**Generated:** ${new Date().toISOString()}\n`
  );
  
  await fs.writeFile(reportPath, updatedReport);
  
  // Display summary
  console.log('\n\n📊 HEALTH CHECK SUMMARY');
  console.log('===================');
  console.log(`Overall Status: ${status}`);
  console.log('\nDetailed Results:');
  
  for (const result of results) {
    let icon = result.error ? '❌' : (result.warning ? '⚠️' : '✅');
    console.log(`${icon} ${result.name}: ${result.error ? 'Failed' : (result.warning ? 'Warnings' : 'Passed')}`);
  }
  
  console.log(`\n📝 Full report available at: ${reportPath}`);
  
  return allPassing && !hasWarnings ? 0 : (allPassing ? 1 : 2);
}

// Main function
async function main() {
  console.log('\n🔍 RAPIDROUTES COMPREHENSIVE HEALTH CHECK');
  console.log('=====================================');
  console.log(`Date: ${new Date().toISOString()}`);
  
  // Run all checks
  const results = [];
  
  for (const check of Object.values(CHECK_TYPES)) {
    const result = await runCheck(check);
    results.push(result);
  }
  
  // Generate final summary and exit
  const exitCode = await generateSummary(results);
  process.exit(exitCode);
}

// Run the main function
main();