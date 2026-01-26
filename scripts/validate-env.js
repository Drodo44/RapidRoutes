#!/usr/bin/env node
// scripts/validate-env.js
// Validates that all required environment variables are present

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

console.log(`${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
console.log(`${colors.cyan}${colors.bold}   🔍 RapidRoutes Environment Validation${colors.reset}\n`);

const checks = [];

// Check NEXT_PUBLIC_SUPABASE_URL (required for client-side)
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (publicUrl) {
  checks.push({ name: 'NEXT_PUBLIC_SUPABASE_URL', status: 'pass', value: publicUrl });
} else {
  checks.push({ name: 'NEXT_PUBLIC_SUPABASE_URL', status: 'fail', value: null });
}

// Check SUPABASE_URL (fallback for server-side)
const serverUrl = process.env.SUPABASE_URL;
if (serverUrl) {
  checks.push({ name: 'SUPABASE_URL', status: 'pass', value: serverUrl });
} else {
  checks.push({ name: 'SUPABASE_URL', status: 'warn', value: null });
}

// Check NEXT_PUBLIC_SUPABASE_ANON_KEY (required for client-side)
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (publicKey) {
  checks.push({ name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', status: 'pass', value: `${publicKey.substring(0, 20)}...` });
} else {
  checks.push({ name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', status: 'fail', value: null });
}

// Check SUPABASE_ANON_KEY (fallback for server-side)
const serverKey = process.env.SUPABASE_ANON_KEY;
if (serverKey) {
  checks.push({ name: 'SUPABASE_ANON_KEY', status: 'pass', value: `${serverKey.substring(0, 20)}...` });
} else {
  checks.push({ name: 'SUPABASE_ANON_KEY', status: 'warn', value: null });
}

// Check SUPABASE_SERVICE_ROLE_KEY (required for server-side admin)
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey) {
  checks.push({ name: 'SUPABASE_SERVICE_ROLE_KEY', status: 'pass', value: `${serviceKey.substring(0, 20)}...` });
} else {
  checks.push({ name: 'SUPABASE_SERVICE_ROLE_KEY', status: 'fail', value: null });
}

// Check HERE_API_KEY (optional but recommended)
const hereKey = process.env.HERE_API_KEY;
if (hereKey && hereKey !== 'replace_me') {
  checks.push({ name: 'HERE_API_KEY', status: 'pass', value: `${hereKey.substring(0, 20)}...` });
} else {
  checks.push({ name: 'HERE_API_KEY', status: 'warn', value: 'Not configured' });
}

// Print results
let hasFailures = false;
let hasWarnings = false;

checks.forEach(check => {
  let icon, color;
  
  if (check.status === 'pass') {
    icon = '✅';
    color = colors.green;
  } else if (check.status === 'warn') {
    icon = '⚠️ ';
    color = colors.yellow;
    hasWarnings = true;
  } else {
    icon = '❌';
    color = colors.red;
    hasFailures = true;
  }
  
  const value = check.value || 'Not set';
  console.log(`${icon} ${color}${check.name}${colors.reset}`);
  if (check.status !== 'pass') {
    console.log(`   ${colors.reset}${value}${colors.reset}`);
  }
});

console.log(`\n${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

// Summary
if (hasFailures) {
  console.log(`${colors.red}${colors.bold}❌ VALIDATION FAILED${colors.reset}`);
  console.log(`${colors.red}Missing required environment variables.${colors.reset}\n`);
  console.log(`${colors.yellow}Action Required:${colors.reset}`);
  console.log(`1. Copy .env.example to .env.local`);
  console.log(`2. Update .env.local with your Supabase credentials`);
  console.log(`3. Make sure to set both NEXT_PUBLIC_* and unprefixed versions\n`);
  console.log(`${colors.cyan}Example:${colors.reset}`);
  console.log(`  NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co`);
  console.log(`  SUPABASE_URL=https://xxxxx.supabase.co`);
  console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`);
  console.log(`  SUPABASE_ANON_KEY=your-anon-key`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n`);
  process.exit(1);
} else if (hasWarnings) {
  console.log(`${colors.yellow}${colors.bold}⚠️  WARNINGS DETECTED${colors.reset}`);
  console.log(`${colors.yellow}Some optional or fallback variables are missing.${colors.reset}\n`);
  console.log(`${colors.yellow}Recommendations:${colors.reset}`);
  console.log(`• Set SUPABASE_URL and SUPABASE_ANON_KEY for better compatibility`);
  console.log(`• Configure HERE_API_KEY if using geocoding features\n`);
  console.log(`${colors.green}Application should still work, but consider adding these for robustness.${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.green}${colors.bold}✅ ALL CHECKS PASSED${colors.reset}`);
  console.log(`${colors.green}Environment is properly configured!${colors.reset}\n`);
  process.exit(0);
}
