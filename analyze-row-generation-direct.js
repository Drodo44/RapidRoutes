#!/usr/bin/env node
/**
 * DIRECT ROW GENERATION ANALYSIS
 * 
 * This script will test the CSV row generation logic directly
 * without relying on the web server to diagnose the 118 vs 144 row issue.
 */

console.log('🎯 DIRECT ROW GENERATION ANALYSIS');
console.log('==================================');

import { adminSupabase } from './utils/supabaseClient.js';

async function analyzeRowGeneration() {
  try {
    console.log('\n1. Checking database connection...');
    
    // Test basic connection
    const { data: testConnection, error: connError } = await adminSupabase
      .from('cities')
      .select('count(*)', { count: 'exact', head: true });
    
    if (connError) {
      console.error('❌ Database connection failed:', connError.message);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Check how many lanes exist
    console.log('\n2. Checking available lanes...');
    const { data: lanes, error: laneError } = await adminSupabase
      .from('lanes')
      .select('*')
      .limit(15); // Get more than 12 to see what we have
    
    if (laneError) {
      console.error('❌ Lane query failed:', laneError.message);
      return;
    }
    
    console.log(`✅ Found ${lanes.length} lanes in database`);
    
    if (lanes.length === 0) {
      console.log('⚠️ No lanes found - need to create test data first');
      return;
    }
    
    // Show first few lanes
    console.log('\n3. Sample lanes:');
    lanes.slice(0, 3).forEach((lane, i) => {
      console.log(`   Lane ${i + 1}: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
      console.log(`             Equipment: ${lane.equipment_code}, Weight: ${lane.weight_lbs}lbs`);
      console.log(`             Status: ${lane.status}, Created: ${lane.created_at?.substring(0, 10)}`);
    });
    
    // Check for the specific issue - Paradise, PA
    console.log('\n4. Checking for problematic cities (like Paradise, PA)...');
    const problemLanes = lanes.filter(lane => 
      (lane.origin_city?.toLowerCase().includes('paradise') && lane.origin_state?.toLowerCase() === 'pa') ||
      (lane.dest_city?.toLowerCase().includes('paradise') && lane.dest_state?.toLowerCase() === 'pa')
    );
    
    if (problemLanes.length > 0) {
      console.log(`⚠️ Found ${problemLanes.length} lanes with Paradise, PA`);
      problemLanes.forEach(lane => {
        console.log(`   Problem lane: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
      });
    } else {
      console.log('✅ No Paradise, PA lanes found');
    }
    
    // Test row calculation theory
    console.log('\n5. Row generation calculation:');
    console.log(`   Lanes found: ${lanes.length}`);
    console.log(`   Expected rows (12 lanes): 12 × 12 = 144 rows`);
    console.log(`   Expected rows (${lanes.length} lanes): ${lanes.length} × 12 = ${lanes.length * 12} rows`);
    console.log(`   Actual rows reported: 118 rows`);
    console.log(`   Missing rows: ${(lanes.length * 12) - 118} rows`);
    
    // Check city availability for sample lanes
    console.log('\n6. Testing city availability for sample lanes...');
    for (let i = 0; i < Math.min(3, lanes.length); i++) {
      const lane = lanes[i];
      console.log(`\n   Testing lane ${i + 1}: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
      
      // Check if origin city exists
      const { data: originCity, error: originError } = await adminSupabase
        .from('cities')
        .select('*')
        .ilike('city', lane.origin_city)
        .ilike('state_or_province', lane.origin_state)
        .limit(1);
      
      if (originError || !originCity || originCity.length === 0) {
        console.log(`   ❌ Origin city not found: ${lane.origin_city}, ${lane.origin_state}`);
      } else {
        console.log(`   ✅ Origin city found: ${originCity[0].city}, ${originCity[0].state_or_province}`);
      }
      
      // Check if destination city exists
      const { data: destCity, error: destError } = await adminSupabase
        .from('cities')
        .select('*')
        .ilike('city', lane.dest_city)
        .ilike('state_or_province', lane.dest_state)
        .limit(1);
      
      if (destError || !destCity || destCity.length === 0) {
        console.log(`   ❌ Destination city not found: ${lane.dest_city}, ${lane.dest_state}`);
      } else {
        console.log(`   ✅ Destination city found: ${destCity[0].city}, ${destCity[0].state_or_province}`);
      }
    }
    
    console.log('\n7. Analysis Summary:');
    console.log('===================');
    if (lanes.length < 12) {
      console.log(`⚠️ Only ${lanes.length} lanes found, expected 12 for testing`);
      console.log(`   This could explain the row shortfall`);
    }
    
    console.log('\nNext steps:');
    console.log('1. If lanes < 12: Create missing test lanes');
    console.log('2. If cities missing: Fix city database');
    console.log('3. If crawl generation failing: Debug crawl logic');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

// Run the analysis
analyzeRowGeneration();
