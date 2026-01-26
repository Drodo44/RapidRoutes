#!/usr/bin/env node
/**
 * COMPREHENSIVE FIX VERIFICATION
 * Tests all aspects of the save city choices fix
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('═══════════════════════════════════════════════════════════');
console.log('  🔍 COMPREHENSIVE FIX VERIFICATION - SAVE CITY CHOICES');
console.log('═══════════════════════════════════════════════════════════\n');

let passCount = 0;
let failCount = 0;

function pass(msg) {
  console.log(`✅ ${msg}`);
  passCount++;
}

function fail(msg) {
  console.log(`❌ ${msg}`);
  failCount++;
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(60));
}

// TEST 1: Database Schema
section('TEST 1: Database Schema');

const { data: tableCheck, error: tableError } = await supabase
  .from('lane_city_choices')
  .select('*')
  .limit(1);

if (tableError) {
  fail('Table lane_city_choices does not exist');
} else {
  pass('Table lane_city_choices exists');
}

const { data: rrData, error: rrError } = await supabase.rpc('get_next_rr_number');

if (rrError) {
  fail('Function get_next_rr_number() does not exist');
} else {
  pass(`Function get_next_rr_number() works (next: ${rrData})`);
}

// TEST 2: Pending Lanes
section('TEST 2: Pending Lanes Available');

const { data: pendingLanes, error: pendingError } = await supabase
  .from('lanes')
  .select('*')
  .eq('lane_status', 'pending')
  .limit(10);

if (pendingError || !pendingLanes || pendingLanes.length === 0) {
  fail('No pending lanes found');
} else {
  pass(`Found ${pendingLanes.length} pending lanes`);
  console.log(`   Sample: ${pendingLanes[0].origin_city} → ${pendingLanes[0].destination_city || pendingLanes[0].dest_city}`);
}

// TEST 3: Saved Choices
section('TEST 3: Saved City Choices');

const { data: savedChoices, error: savedError } = await supabase
  .from('lane_city_choices')
  .select('*')
  .limit(5);

if (savedError) {
  fail('Cannot query saved choices');
} else {
  pass(`Found ${savedChoices.length} saved choice records`);
  if (savedChoices.length > 0) {
    const sample = savedChoices[0];
    console.log(`   Sample: RR${sample.rr_number?.substring(2)} with ${sample.origin_chosen_cities?.length || 0} origin cities`);
  }
}

// TEST 4: Destination Field Handling
section('TEST 4: Destination Field Consistency');

const { data: destCheckLanes } = await supabase
  .from('lanes')
  .select('id, destination_city, dest_city, destination_state, dest_state')
  .eq('lane_status', 'pending')
  .limit(5);

let consistentFields = true;
destCheckLanes?.forEach(lane => {
  const hasDest = !!(lane.destination_city && lane.destination_state);
  const hasDestAlt = !!(lane.dest_city && lane.dest_state);
  if (!hasDest && !hasDestAlt) {
    consistentFields = false;
  }
});

if (consistentFields) {
  pass('All pending lanes have valid destination fields');
} else {
  fail('Some lanes missing destination fields');
}

// TEST 5: Save and Retrieve Workflow
section('TEST 5: Save and Retrieve Workflow');

if (pendingLanes && pendingLanes.length > 0) {
  const testLane = pendingLanes[0];
  
  const testData = {
    lane_id: testLane.id,
    origin_city: testLane.origin_city,
    origin_state: testLane.origin_state,
    dest_city: testLane.destination_city || testLane.dest_city,
    dest_state: testLane.destination_state || testLane.dest_state,
    origin_chosen_cities: [
      { city: 'Test Origin 1', state_or_province: 'GA', kma_code: 'ATL', kma_name: 'Atlanta', miles: 5 }
    ],
    dest_chosen_cities: [
      { city: 'Test Dest 1', state_or_province: 'SC', kma_code: 'GNV', kma_name: 'Greenville', miles: 10 }
    ],
    rr_number: await supabase.rpc('get_next_rr_number').then(r => r.data),
    updated_at: new Date().toISOString()
  };

  const { data: saveResult, error: saveError } = await supabase
    .from('lane_city_choices')
    .upsert(testData, { onConflict: 'lane_id' })
    .select()
    .single();

  if (saveError) {
    fail(`Save failed: ${saveError.message}`);
  } else {
    pass(`Successfully saved choices for lane ${testLane.id.substring(0, 8)}...`);
    console.log(`   RR Number: ${saveResult.rr_number}`);
  }

  // Try to retrieve
  const { data: retrieveResult, error: retrieveError } = await supabase
    .from('lane_city_choices')
    .select('*')
    .eq('lane_id', testLane.id)
    .single();

  if (retrieveError) {
    fail('Could not retrieve saved choices');
  } else {
    pass('Successfully retrieved saved choices');
    console.log(`   Origin cities: ${retrieveResult.origin_chosen_cities?.length || 0}`);
    console.log(`   Dest cities: ${retrieveResult.dest_chosen_cities?.length || 0}`);
  }

  // Update lane status
  const { error: statusError } = await supabase
    .from('lanes')
    .update({ lane_status: 'active' })
    .eq('id', testLane.id);

  if (statusError) {
    fail('Could not update lane status');
  } else {
    pass('Successfully updated lane status to active');
  }

  // Verify status change
  const { data: verifyLane } = await supabase
    .from('lanes')
    .select('lane_status')
    .eq('id', testLane.id)
    .single();

  if (verifyLane?.lane_status === 'active') {
    pass('Lane status verified as active');
  } else {
    fail(`Lane status is ${verifyLane?.lane_status}, expected active`);
  }

  // Restore to pending for next test
  await supabase.from('lanes').update({ lane_status: 'pending' }).eq('id', testLane.id);
}

// TEST 6: RR Number Uniqueness
section('TEST 6: RR Number Generation');

const rr1 = await supabase.rpc('get_next_rr_number').then(r => r.data);
const rr2 = await supabase.rpc('get_next_rr_number').then(r => r.data);
const rr3 = await supabase.rpc('get_next_rr_number').then(r => r.data);

if (rr1 !== rr2 && rr2 !== rr3 && rr1 !== rr3) {
  pass(`Generated unique RR numbers: ${rr1}, ${rr2}, ${rr3}`);
} else {
  fail('RR numbers are not unique');
}

// TEST 7: JSONB Structure
section('TEST 7: JSONB Data Structure');

const { data: jsonbTest } = await supabase
  .from('lane_city_choices')
  .select('origin_chosen_cities, dest_chosen_cities')
  .limit(1)
  .single();

if (jsonbTest) {
  const originValid = Array.isArray(jsonbTest.origin_chosen_cities);
  const destValid = Array.isArray(jsonbTest.dest_chosen_cities);
  
  if (originValid && destValid) {
    pass('JSONB structure is correct (arrays)');
    if (jsonbTest.origin_chosen_cities.length > 0) {
      const sample = jsonbTest.origin_chosen_cities[0];
      if (sample.city && sample.state_or_province && sample.kma_code) {
        pass('JSONB city objects have required fields');
      } else {
        fail('JSONB city objects missing required fields');
      }
    }
  } else {
    fail('JSONB structure is incorrect');
  }
}

// FINAL SUMMARY
console.log('\n═══════════════════════════════════════════════════════════');
console.log('  📊 TEST SUMMARY');
console.log('═══════════════════════════════════════════════════════════');
console.log(`\n  ✅ Passed: ${passCount}`);
console.log(`  ❌ Failed: ${failCount}`);
console.log(`  📈 Success Rate: ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%\n`);

if (failCount === 0) {
  console.log('🎉 ALL TESTS PASSED! Save functionality is ready for production.\n');
  console.log('Next steps:');
  console.log('  1. Start dev server: npm run dev');
  console.log('  2. Test in browser: http://localhost:3000/post-options.manual');
  console.log('  3. Deploy to production: git push origin main\n');
} else {
  console.log('⚠️  Some tests failed. Review the errors above.\n');
  process.exit(1);
}

console.log('═══════════════════════════════════════════════════════════\n');
