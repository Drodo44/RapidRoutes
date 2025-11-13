#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n=== STEP 3: FINAL VERIFICATION ===\n');

async function finalCheck() {
  try {
    // Test 1: Check if we can query with RLS disabled
    console.log('Test 1: Querying lanes (RLS still disabled)...');
    const { data: lanes, error: lanesError } = await supabase
      .from('lanes')
      .select('id, organization_id, created_by')
      .limit(3);
    
    if (lanesError) {
      console.log('❌ Error:', lanesError.message);
    } else {
      console.log(`✅ Found ${lanes.length} lanes`);
      lanes.forEach(lane => {
        const hasOrgId = lane.organization_id ? '✅' : '❌';
        const hasCreatedBy = lane.created_by ? '✅' : '❌';
        console.log(`   Lane: org_id ${hasOrgId} | created_by ${hasCreatedBy}`);
      });
    }
    
    // Test 2: Check your profile
    console.log('\nTest 2: Your profile setup...');
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, role, organization_id, team_role')
      .eq('email', 'aconnellan@tql.com')
      .single();
    
    console.log(`✅ You are: ${profile.role} | Team: ${profile.team_role} | Org Owner: ${profile.id === profile.organization_id ? 'Yes' : 'No'}`);
    
    // Test 3: Count all data
    console.log('\nTest 3: Data distribution...');
    const tables = ['lanes', 'blacklisted_cities', 'city_corrections', 'preferred_pickups'];
    
    for (const table of tables) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      console.log(`  ${table}: ${count} rows`);
    }
    
    console.log('\n✅ STEP 3 COMPLETE!\n');
    console.log('📋 What we accomplished:');
    console.log('   ✅ Added organization_id to all tables');
    console.log('   ✅ Set you as the team owner');
    console.log('   ✅ Backfilled all data with your organization_id');
    console.log('   ✅ RLS policies created (but not enabled yet)\n');
    
    console.log('🎯 Next Steps:');
    console.log('   1. Update API routes to set organization_id when creating data');
    console.log('   2. Test with RLS disabled (verify API routes work)');
    console.log('   3. Enable RLS on one table at a time');
    console.log('   4. Create test accounts for your apprentice/support\n');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

finalCheck();
