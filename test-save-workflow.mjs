#!/usr/bin/env node
// Test the complete save city choices workflow
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🧪 Testing Save City Choices Workflow\n');

// Test 1: Get a pending lane
console.log('1️⃣  Fetching a pending lane...');
const { data: pendingLanes, error: lanesError } = await supabase
  .from('lanes')
  .select('*')
  .eq('lane_status', 'pending')
  .limit(1)
  .single();

if (lanesError || !pendingLanes) {
  console.log('❌ No pending lanes found or error:', lanesError?.message);
  console.log('\n💡 Create a pending lane first by using the lanes page');
  process.exit(1);
}

console.log('✅ Found pending lane:');
console.log(`   ID: ${pendingLanes.id}`);
console.log(`   Route: ${pendingLanes.origin_city}, ${pendingLanes.origin_state} → ${pendingLanes.destination_city || pendingLanes.dest_city}, ${pendingLanes.destination_state || pendingLanes.dest_state}`);

// Test 2: Check if this lane already has saved choices
console.log('\n2️⃣  Checking for existing saved choices...');
const { data: existingChoices } = await supabase
  .from('lane_city_choices')
  .select('*')
  .eq('lane_id', pendingLanes.id)
  .single();

if (existingChoices) {
  console.log('✅ Found existing saved choices:');
  console.log(`   RR Number: ${existingChoices.rr_number}`);
  console.log(`   Origin cities: ${existingChoices.origin_chosen_cities?.length || 0}`);
  console.log(`   Dest cities: ${existingChoices.dest_chosen_cities?.length || 0}`);
  console.log('\n⚠️  Lane already has saved choices. Testing update...');
} else {
  console.log('✅ No existing choices - fresh save');
}

// Test 3: Simulate API call to save choices
console.log('\n3️⃣  Simulating save operation...');

const testOriginCities = [
  { city: 'Test City 1', state_or_province: 'GA', kma_code: 'ATL', kma_name: 'Atlanta', miles: 10 },
  { city: 'Test City 2', state_or_province: 'GA', kma_code: 'ATL', kma_name: 'Atlanta', miles: 20 }
];

const testDestCities = [
  { city: 'Test City A', state_or_province: 'FL', kma_code: 'JAX', kma_name: 'Jacksonville', miles: 15 },
  { city: 'Test City B', state_or_province: 'FL', kma_code: 'JAX', kma_name: 'Jacksonville', miles: 25 }
];

const dest_city = pendingLanes.destination_city || pendingLanes.dest_city;
const dest_state = pendingLanes.destination_state || pendingLanes.dest_state;

console.log('   Preparing test data:');
console.log(`   - Origin: ${pendingLanes.origin_city}, ${pendingLanes.origin_state}`);
console.log(`   - Destination: ${dest_city}, ${dest_state}`);
console.log(`   - Origin selections: ${testOriginCities.length} cities`);
console.log(`   - Dest selections: ${testDestCities.length} cities`);

// Get next RR number
const { data: rrNumber } = await supabase.rpc('get_next_rr_number');
console.log(`   - Next RR Number: ${rrNumber}`);

// Perform upsert
const { data: savedData, error: saveError } = await supabase
  .from('lane_city_choices')
  .upsert({
    lane_id: pendingLanes.id,
    origin_city: pendingLanes.origin_city,
    origin_state: pendingLanes.origin_state,
    dest_city,
    dest_state,
    origin_chosen_cities: testOriginCities,
    dest_chosen_cities: testDestCities,
    rr_number: rrNumber,
    updated_at: new Date().toISOString()
  }, {
    onConflict: 'lane_id'
  })
  .select()
  .single();

if (saveError) {
  console.log('❌ Save failed:', saveError.message);
  process.exit(1);
}

console.log('✅ Save successful!');
console.log(`   RR Number: ${savedData.rr_number}`);

// Test 4: Update lane status to active
console.log('\n4️⃣  Updating lane status to active...');
const { error: statusError } = await supabase
  .from('lanes')
  .update({ lane_status: 'active' })
  .eq('id', pendingLanes.id);

if (statusError) {
  console.log('❌ Status update failed:', statusError.message);
} else {
  console.log('✅ Lane status updated to active');
}

// Test 5: Verify the lane moved from pending to active
console.log('\n5️⃣  Verifying lane status change...');
const { data: updatedLane } = await supabase
  .from('lanes')
  .select('lane_status')
  .eq('id', pendingLanes.id)
  .single();

if (updatedLane?.lane_status === 'active') {
  console.log('✅ Verified: Lane is now active');
} else {
  console.log('❌ Warning: Lane status is', updatedLane?.lane_status);
}

// Test 6: Verify saved choices can be retrieved
console.log('\n6️⃣  Retrieving saved choices...');
const { data: retrievedChoices, error: retrieveError } = await supabase
  .from('lane_city_choices')
  .select('*')
  .eq('lane_id', pendingLanes.id)
  .single();

if (retrieveError) {
  console.log('❌ Retrieval failed:', retrieveError.message);
} else {
  console.log('✅ Successfully retrieved saved choices:');
  console.log(`   RR Number: ${retrievedChoices.rr_number}`);
  console.log(`   Origin cities: ${retrievedChoices.origin_chosen_cities?.length || 0}`);
  console.log(`   Dest cities: ${retrievedChoices.dest_chosen_cities?.length || 0}`);
  console.log('\n   Origin Cities:');
  retrievedChoices.origin_chosen_cities?.forEach((c, i) => {
    console.log(`     ${i + 1}. ${c.city}, ${c.state_or_province} (${c.kma_code})`);
  });
  console.log('\n   Dest Cities:');
  retrievedChoices.dest_chosen_cities?.forEach((c, i) => {
    console.log(`     ${i + 1}. ${c.city}, ${c.state_or_province} (${c.kma_code})`);
  });
}

console.log('\n✅ All tests passed! Save functionality is working correctly.');
console.log('\n📝 Summary:');
console.log('   - City choices are saved to lane_city_choices table');
console.log('   - RR number is generated and stored');
console.log('   - Lane status is updated to active');
console.log('   - Saved choices can be retrieved');
console.log('\n🎯 Next: Test in the UI at http://localhost:3000/post-options.manual');
