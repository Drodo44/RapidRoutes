// step1-analyze-current-state.mjs
// READ-ONLY analysis of current database state

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeCurrentState() {
  console.log('=== STEP 1: CURRENT STATE ANALYSIS ===\n');
  
  // 1. Check your user profile
  console.log('1️⃣ YOUR USER PROFILE:');
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'aconnellan@tql.com')
    .single();
  
  if (profileError) {
    console.error('❌ Error fetching profile:', profileError.message);
  } else {
    console.log({
      id: profiles.id,
      email: profiles.email,
      role: profiles.role,
      status: profiles.status,
      has_organization_id: !!profiles.organization_id
    });
  }
  
  // 2. Check lanes table structure
  console.log('\n2️⃣ LANES TABLE STRUCTURE:');
  const { data: sampleLane, error: laneError } = await supabase
    .from('lanes')
    .select('*')
    .limit(1)
    .single();
  
  if (!laneError && sampleLane) {
    const hasCreatedBy = 'created_by' in sampleLane;
    console.log({
      has_created_by_column: hasCreatedBy,
      created_by_value: sampleLane.created_by || 'NULL',
      sample_lane_id: sampleLane.id
    });
  } else {
    console.log('No lanes found or error:', laneError?.message);
  }
  
  // 3. Check how many lanes exist
  console.log('\n3️⃣ LANES COUNT:');
  const { count: totalLanes } = await supabase
    .from('lanes')
    .select('*', { count: 'exact', head: true });
  
  console.log({
    total_lanes: totalLanes
  });
  
  // 4. Check lanes with created_by set vs NULL
  if (sampleLane && 'created_by' in sampleLane) {
    const { count: lanesWithCreatedBy } = await supabase
      .from('lanes')
      .select('*', { count: 'exact', head: true })
      .not('created_by', 'is', null);
    
    const { count: lanesWithoutCreatedBy } = await supabase
      .from('lanes')
      .select('*', { count: 'exact', head: true })
      .is('created_by', null);
    
    console.log({
      lanes_with_created_by: lanesWithCreatedBy,
      lanes_without_created_by: lanesWithoutCreatedBy
    });
  }
  
  // 5. Check other user-owned tables
  console.log('\n4️⃣ OTHER TABLES STATUS:');
  
  const tablesToCheck = [
    'blacklisted_cities',
    'city_corrections',
    'preferred_pickups',
    'saved_cities'
  ];
  
  for (const table of tablesToCheck) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.log(`${table}: Error - ${error.message}`);
    } else if (data) {
      console.log(`${table}: ${('created_by' in data) ? '✅ has created_by' : '❌ no created_by'}`);
    } else {
      console.log(`${table}: Table exists but empty`);
    }
  }
  
  // 6. Check RLS status (via error messages - RLS enabled will block service role)
  console.log('\n5️⃣ RLS STATUS CHECK:');
  console.log('Note: If service role can access everything, RLS is likely DISABLED');
  console.log('(This is expected based on migration 005-emergency-access-fix.sql)');
  
  console.log('\n=== ANALYSIS COMPLETE ===\n');
  console.log('📋 SUMMARY:');
  console.log('- Your user ID:', profiles?.id);
  console.log('- Total lanes:', totalLanes);
  console.log('- Lanes table has created_by:', sampleLane && 'created_by' in sampleLane ? 'YES' : 'NO');
  console.log('\n✅ Ready to proceed to Step 2 once you review this output');
}

analyzeCurrentState().catch(console.error);
