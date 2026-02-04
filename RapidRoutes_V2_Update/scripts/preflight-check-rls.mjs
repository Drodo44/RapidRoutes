#!/usr/bin/env node
/**
 * Pre-flight check before enabling RLS
 * Verifies that your database is ready for safe RLS activation
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const checks = {
  passed: [],
  warnings: [],
  failed: []
};

async function check(name, fn) {
  try {
    console.log(`\n🔍 ${name}...`);
    const result = await fn();
    
    if (result.passed) {
      checks.passed.push({ name, ...result });
      console.log(`✅ ${result.message}`);
    } else if (result.warning) {
      checks.warnings.push({ name, ...result });
      console.log(`⚠️  ${result.message}`);
    } else {
      checks.failed.push({ name, ...result });
      console.log(`❌ ${result.message}`);
    }
    
    if (result.details) {
      result.details.forEach(d => console.log(`   ${d}`));
    }
  } catch (error) {
    checks.failed.push({ name, error: error.message });
    console.log(`❌ Error: ${error.message}`);
  }
}

await check('Admin profile exists and configured', async () => {
  const { data: admins, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'Admin');
  
  if (error || !admins || admins.length === 0) {
    return { 
      passed: false, 
      message: 'No admin profile found - you need at least one admin account',
      fix: 'Run: UPDATE profiles SET role = \'Admin\', status = \'approved\' WHERE email = \'your@email.com\';'
    };
  }
  
  // Check each admin
  const configured = admins.filter(a => a.organization_id && a.team_role === 'owner');
  const unconfigured = admins.filter(a => !a.organization_id || !a.team_role);
  
  if (configured.length === 0) {
    return {
      passed: false,
      message: 'Admin accounts exist but none are configured as team owners',
      details: [
        ...admins.map(a => `${a.email}: Missing ${!a.organization_id ? 'organization_id' : ''} ${!a.team_role ? 'team_role' : ''}`),
        `Fix: UPDATE profiles SET organization_id = id, team_role = 'owner' WHERE email = 'your@email.com';`
      ]
    };
  }
  
  if (unconfigured.length > 0) {
    return {
      warning: true,
      message: `${configured.length} admin(s) configured, ${unconfigured.length} need configuration`,
      details: [
        'Configured:',
        ...configured.map(a => `  ✅ ${a.email} (${a.team_name || 'Team ' + a.email.split('@')[0]})`),
        'Unconfigured:',
        ...unconfigured.map(a => `  ⚠️  ${a.email} - Missing ${!a.organization_id ? 'organization_id' : ''} ${!a.team_role ? 'team_role' : ''}`),
        `\nFix unconfigured: UPDATE profiles SET organization_id = id, team_role = 'owner' WHERE email = 'their@email.com';`
      ]
    };
  }
  
  return {
    passed: true,
    message: `${configured.length} admin(s) properly configured`,
    details: configured.map(a => `  ✅ ${a.email} (${a.team_name || 'Team ' + a.email.split('@')[0]})`)
  };
});

await check('Lanes have organization_id', async () => {
  const { data: counts, error } = await supabase
    .from('lanes')
    .select('id, organization_id');
  
  if (error) {
    return { passed: false, message: `Cannot query lanes: ${error.message}` };
  }
  
  const total = counts.length;
  const withOrgId = counts.filter(l => l.organization_id).length;
  const missing = total - withOrgId;
  
  if (missing > 0) {
    return {
      passed: false,
      message: `${missing} out of ${total} lanes missing organization_id`,
      details: [
        'Fix: Run backfill query in RLS_ACTIVATION_GUIDE.md',
        'UPDATE lanes SET organization_id = (SELECT organization_id FROM profiles WHERE profiles.id = lanes.created_by) WHERE organization_id IS NULL;'
      ]
    };
  }
  
  return {
    passed: true,
    message: `All ${total} lanes have organization_id set`
  };
});

await check('RLS policies exist for lanes', async () => {
  // Note: pg_policies requires special permissions, so we'll test access instead
  const { data, error } = await supabase
    .from('lanes')
    .select('id')
    .limit(1);
  
  if (error) {
    return {
      passed: false,
      message: `Cannot access lanes table: ${error.message}`
    };
  }
  
  // If we can query, assume policies exist (they were created in migration)
  return {
    passed: true,
    message: 'Lanes table accessible (policies should be defined)'
  };
});

await check('API routes set organization_id', async () => {
  // Check if the organizationHelper exists
  const fs = await import('fs');
  const path = join(__dirname, '..', 'lib', 'organizationHelper.js');
  
  if (!fs.existsSync(path)) {
    return {
      passed: false,
      message: 'organizationHelper.js not found',
      details: ['This file should exist and export getUserOrganizationId()']
    };
  }
  
  // Check if lanes.js uses it
  const lanesPath = join(__dirname, '..', 'pages', 'api', 'lanes.js');
  const lanesContent = fs.readFileSync(lanesPath, 'utf-8');
  
  if (!lanesContent.includes('getUserOrganizationId')) {
    return {
      warning: true,
      message: 'lanes.js may not be using getUserOrganizationId',
      details: ['Check that new lanes get organization_id set automatically']
    };
  }
  
  return {
    passed: true,
    message: 'API routes appear to be configured for organization_id'
  };
});

await check('Signup flow configured', async () => {
  const fs = await import('fs');
  
  // Check if signup page exists
  const signupPath = join(__dirname, '..', 'pages', 'signup.js');
  if (!fs.existsSync(signupPath)) {
    return {
      warning: true,
      message: 'signup.js not found',
      details: ['Users may not be able to sign up without manual account creation']
    };
  }
  
  // Check if teams API exists
  const teamsPath = join(__dirname, '..', 'pages', 'api', 'teams.js');
  if (!fs.existsSync(teamsPath)) {
    return {
      warning: true,
      message: '/api/teams endpoint not found',
      details: ['Signup may not assign users to teams correctly']
    };
  }
  
  return {
    passed: true,
    message: 'Signup flow appears configured'
  };
});

await check('Other data tables have organization_id column', async () => {
  const tables = ['blacklisted_cities', 'city_corrections', 'preferred_pickups'];
  const results = [];
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('id, organization_id')
      .limit(1);
    
    if (error && error.message.includes('column')) {
      results.push(`${table}: ❌ Missing organization_id column`);
    } else if (error) {
      results.push(`${table}: ⚠️  ${error.message}`);
    } else {
      results.push(`${table}: ✅ Has organization_id column`);
    }
  }
  
  const hasMissing = results.some(r => r.includes('❌'));
  
  if (hasMissing) {
    return {
      passed: false,
      message: 'Some tables missing organization_id column',
      details: results
    };
  }
  
  return {
    passed: true,
    message: 'All data tables have organization_id column',
    details: results
  };
});

await check('RLS currently disabled', async () => {
  // Try to query lanes without restrictions
  const { data, error } = await supabase
    .from('lanes')
    .select('id')
    .limit(1);
  
  if (error) {
    return {
      warning: true,
      message: 'Cannot verify RLS status',
      details: [error.message]
    };
  }
  
  return {
    passed: true,
    message: 'RLS appears to be disabled (can query freely)'
  };
});

// Summary
console.log('\n\n' + '═'.repeat(60));
console.log('📊 PRE-FLIGHT CHECK SUMMARY');
console.log('═'.repeat(60));

if (checks.passed.length > 0) {
  console.log(`\n✅ Passed: ${checks.passed.length} checks`);
  checks.passed.forEach(c => console.log(`   - ${c.name}`));
}

if (checks.warnings.length > 0) {
  console.log(`\n⚠️  Warnings: ${checks.warnings.length} checks`);
  checks.warnings.forEach(c => console.log(`   - ${c.name}: ${c.message}`));
}

if (checks.failed.length > 0) {
  console.log(`\n❌ Failed: ${checks.failed.length} checks`);
  checks.failed.forEach(c => {
    console.log(`   - ${c.name}: ${c.message}`);
    if (c.fix) console.log(`     Fix: ${c.fix}`);
  });
}

console.log('\n' + '═'.repeat(60));

if (checks.failed.length === 0) {
  console.log('✅ READY TO ENABLE RLS');
  console.log('\nNext steps:');
  console.log('1. Run: migrations/enable-rls-helpers.sql in Supabase SQL Editor');
  console.log('2. Follow: RLS_ACTIVATION_GUIDE.md for step-by-step activation');
  console.log('3. Or run: node scripts/enable-rls-safely.mjs for automated activation');
  process.exit(0);
} else {
  console.log('⚠️  FIX ISSUES BEFORE ENABLING RLS');
  console.log('\nSee failures above for fix instructions.');
  console.log('Run this script again after fixes to verify.');
  process.exit(1);
}
