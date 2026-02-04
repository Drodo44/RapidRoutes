#!/usr/bin/env node
// test-admin-toggle.mjs - Test Admin view toggle functionality
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminToggle() {
  console.log('🧪 Testing Admin View Toggle Functionality\n');
  
  // Get admin user
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'aconnellan@tql.com')
    .single();
  
  if (!adminProfile) {
    console.error('❌ Admin profile not found');
    return;
  }
  
  console.log('👤 Admin User:', {
    email: adminProfile.email,
    role: adminProfile.role,
    organization_id: adminProfile.organization_id
  });
  
  // Test 1: Get ALL lanes (no filter)
  console.log('\n📊 Test 1: All RapidRoutes Lanes (no organizationId filter)');
  const { data: allLanes, error: allError } = await supabase
    .from('lanes')
    .select('*')
    .eq('lane_status', 'current')
    .order('created_at', { ascending: false });
  
  if (allError) {
    console.error('❌ Error fetching all lanes:', allError);
  } else {
    console.log(`✅ Total lanes: ${allLanes.length}`);
    
    // Group by organization
    const byOrg = {};
    for (const lane of allLanes) {
      const orgId = lane.organization_id || 'null';
      byOrg[orgId] = (byOrg[orgId] || 0) + 1;
    }
    
    console.log('   Lanes by organization:');
    for (const [orgId, count] of Object.entries(byOrg)) {
      // Get org name
      const { data: org } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('organization_id', orgId)
        .eq('team_role', 'owner')
        .single();
      
      const orgName = org ? `${org.first_name} ${org.last_name}` : 'Unknown';
      console.log(`   - ${orgName} (${orgId.slice(0, 8)}...): ${count} lanes`);
    }
  }
  
  // Test 2: Get only Admin's team lanes (with filter)
  console.log('\n📊 Test 2: My Team\'s Lanes (filtered by organizationId)');
  const { data: myLanes, error: myError } = await supabase
    .from('lanes')
    .select('*')
    .eq('lane_status', 'current')
    .eq('organization_id', adminProfile.organization_id)
    .order('created_at', { ascending: false });
  
  if (myError) {
    console.error('❌ Error fetching team lanes:', myError);
  } else {
    console.log(`✅ Team Connellan lanes: ${myLanes.length}`);
    
    // Show first few lanes as examples
    console.log('   Sample lanes:');
    myLanes.slice(0, 3).forEach(lane => {
      console.log(`   - ${lane.reference_id}: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
    });
  }
  
  // Test 3: Verify Kyle's lane is NOT in filtered results
  console.log('\n🔍 Test 3: Verify Kyle\'s lane appears only in "All Lanes"');
  const kylesLane = allLanes.find(l => l.created_by === 'ktaylor@tql.com');
  
  if (kylesLane) {
    console.log(`✅ Found Kyle's lane in ALL lanes: ${kylesLane.reference_id} (${kylesLane.origin_city} → ${kylesLane.dest_city})`);
    
    const inMyLanes = myLanes.find(l => l.id === kylesLane.id);
    if (inMyLanes) {
      console.log('❌ ERROR: Kyle\'s lane should NOT appear in "My Team\'s Lanes"');
    } else {
      console.log('✅ Confirmed: Kyle\'s lane is NOT in "My Team\'s Lanes" (correct!)');
    }
  } else {
    console.log('⚠️  No lanes found from ktaylor@tql.com');
  }
  
  console.log('\n✅ Test Complete!');
  console.log('\n📋 Summary:');
  console.log(`   - All Lanes: ${allLanes?.length || 0} total`);
  console.log(`   - My Team's Lanes: ${myLanes?.length || 0} total`);
  console.log(`   - Difference: ${(allLanes?.length || 0) - (myLanes?.length || 0)} lanes from other teams`);
}

testAdminToggle().catch(console.error);
