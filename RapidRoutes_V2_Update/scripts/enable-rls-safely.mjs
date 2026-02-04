#!/usr/bin/env node
/**
 * Safe RLS Enablement Script
 * Enables Row Level Security one table at a time with verification between each step
 * Can be run multiple times safely - idempotent
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tables to enable RLS on, in order of importance/safety
const TABLES = [
  'lanes',
  'blacklisted_cities',
  'city_corrections',
  'preferred_pickups',
  'posted_pairs',
  'city_performance'
];

/**
 * Check if RLS is already enabled on a table
 */
async function checkRLSStatus(tableName) {
  const { data, error } = await supabase.rpc('check_rls_status', {
    table_name: tableName
  }).single();
  
  if (error) {
    // Fallback: Query pg_tables directly
    const { data: pgData, error: pgError } = await supabase
      .from('pg_tables')
      .select('rowsecurity')
      .eq('schemaname', 'public')
      .eq('tablename', tableName)
      .single();
    
    if (pgError) {
      console.warn(`⚠️  Could not check RLS status for ${tableName}:`, pgError.message);
      return null;
    }
    return pgData?.rowsecurity || false;
  }
  
  return data?.rowsecurity || false;
}

/**
 * Verify policies exist for a table
 */
async function verifyPolicies(tableName) {
  const { data, error } = await supabase
    .from('pg_policies')
    .select('policyname')
    .eq('schemaname', 'public')
    .eq('tablename', tableName);
  
  if (error) {
    console.warn(`⚠️  Could not verify policies for ${tableName}:`, error.message);
    return [];
  }
  
  return data || [];
}

/**
 * Test if current user can still access data after RLS is enabled
 */
async function testAccess(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { success: true, rowCount: data?.length || 0 };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Enable RLS on a specific table
 */
async function enableRLS(tableName) {
  console.log(`\n🔄 Processing table: ${tableName}`);
  console.log('─'.repeat(60));
  
  // Step 1: Check current RLS status
  const isEnabled = await checkRLSStatus(tableName);
  
  if (isEnabled === true) {
    console.log(`✅ RLS already enabled on ${tableName}`);
    return { success: true, alreadyEnabled: true };
  }
  
  if (isEnabled === null) {
    console.log(`⚠️  Could not determine RLS status for ${tableName}`);
    console.log(`   Proceeding with caution...`);
  } else {
    console.log(`📝 RLS currently disabled on ${tableName}`);
  }
  
  // Step 2: Verify policies exist
  console.log(`\n🔍 Checking policies for ${tableName}...`);
  const policies = await verifyPolicies(tableName);
  
  if (policies.length === 0) {
    console.log(`❌ No policies found for ${tableName}`);
    console.log(`   You need to run the migration first: migrations/step3-team-based-rls.sql`);
    return { success: false, reason: 'No policies found' };
  }
  
  console.log(`✅ Found ${policies.length} policies:`);
  policies.forEach(p => console.log(`   - ${p.policyname}`));
  
  // Step 3: Test access BEFORE enabling RLS
  console.log(`\n🧪 Testing access before RLS...`);
  const beforeTest = await testAccess(tableName);
  
  if (!beforeTest.success) {
    console.log(`❌ Cannot access ${tableName} before RLS:`);
    console.log(`   Error: ${beforeTest.error}`);
    return { success: false, reason: 'Pre-test access failed' };
  }
  
  console.log(`✅ Access test passed (${beforeTest.rowCount} rows accessible)`);
  
  // Step 4: Enable RLS
  console.log(`\n🔐 Enabling RLS on ${tableName}...`);
  
  const { error: enableError } = await supabase.rpc('enable_rls_on_table', {
    table_name: tableName
  });
  
  if (enableError) {
    // Fallback: Try direct SQL
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE ${tableName} ENABLE ROW LEVEL SECURITY;`
    });
    
    if (sqlError) {
      console.log(`❌ Failed to enable RLS: ${sqlError.message}`);
      return { success: false, reason: 'Enable RLS failed' };
    }
  }
  
  // Step 5: Test access AFTER enabling RLS
  console.log(`\n🧪 Testing access after RLS...`);
  const afterTest = await testAccess(tableName);
  
  if (!afterTest.success) {
    console.log(`❌ Cannot access ${tableName} after RLS!`);
    console.log(`   Error: ${afterTest.error}`);
    console.log(`\n🔄 ROLLING BACK...`);
    
    // Try to disable RLS
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE ${tableName} DISABLE ROW LEVEL SECURITY;`
    });
    
    console.log(`⚠️  RLS disabled on ${tableName} - please check policies`);
    return { success: false, reason: 'Post-test access failed', rolledBack: true };
  }
  
  console.log(`✅ Access test passed (${afterTest.rowCount} rows accessible)`);
  console.log(`\n✅ RLS successfully enabled on ${tableName}`);
  
  return { success: true, alreadyEnabled: false };
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🔐 Safe RLS Enablement Script');
  console.log('═'.repeat(60));
  console.log('This script will enable Row Level Security on each table');
  console.log('one at a time, with verification between each step.\n');
  
  const results = {
    success: [],
    alreadyEnabled: [],
    failed: []
  };
  
  for (const table of TABLES) {
    try {
      const result = await enableRLS(table);
      
      if (result.success) {
        if (result.alreadyEnabled) {
          results.alreadyEnabled.push(table);
        } else {
          results.success.push(table);
        }
      } else {
        results.failed.push({ table, reason: result.reason, rolledBack: result.rolledBack });
      }
      
      // Wait a bit between tables to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`\n❌ Unexpected error processing ${table}:`, error.message);
      results.failed.push({ table, reason: 'Unexpected error', error: error.message });
    }
  }
  
  // Summary
  console.log('\n\n📊 SUMMARY');
  console.log('═'.repeat(60));
  
  if (results.success.length > 0) {
    console.log(`\n✅ RLS Enabled (${results.success.length}):`);
    results.success.forEach(t => console.log(`   - ${t}`));
  }
  
  if (results.alreadyEnabled.length > 0) {
    console.log(`\n✅ Already Enabled (${results.alreadyEnabled.length}):`);
    results.alreadyEnabled.forEach(t => console.log(`   - ${t}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed (${results.failed.length}):`);
    results.failed.forEach(f => {
      console.log(`   - ${f.table}: ${f.reason}`);
      if (f.rolledBack) {
        console.log(`     (Rolled back - RLS disabled)`);
      }
    });
  }
  
  const totalEnabled = results.success.length + results.alreadyEnabled.length;
  const totalTables = TABLES.length;
  
  console.log(`\n📈 Progress: ${totalEnabled}/${totalTables} tables secured`);
  
  if (results.failed.length === 0) {
    console.log('\n🎉 All tables successfully secured with RLS!');
    return 0;
  } else {
    console.log('\n⚠️  Some tables failed - see details above');
    return 1;
  }
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
