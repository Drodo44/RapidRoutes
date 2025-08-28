#!/usr/bin/env node

/**
 * SINGLE LANE TEST: Verify enhanced system generates 5 pairs per lane
 */

import { adminSupabase as supabase } from './utils/supabaseClient.js';
import { planPairsForLane, rowsFromBaseAndPairs } from './lib/datCsvBuilder.js';

async function testSingleLane() {
  console.log('🧪 SINGLE LANE TEST: Enhanced System Performance');
  console.log('');

  try {
    // Get one active lane
    const { data: lanes, error } = await supabase
      .from('lanes')
      .select('*')
      .eq('status', 'active')
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error);
      return;
    }

    if (!lanes || lanes.length === 0) {
      console.error('❌ No active lanes found');
      return;
    }

    const lane = lanes[0];
    console.log(`🎯 Testing lane: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
    console.log(`📦 Equipment: ${lane.equipment_code}, Weight: ${lane.weight_lbs} lbs`);
    console.log('');

    // Test with enhanced system (preferFillTo10 = true)
    console.log('🚀 ENHANCED SYSTEM TEST (preferFillTo10 = true):');
    const enhancedCrawl = await planPairsForLane(lane, { preferFillTo10: true });
    console.log(`  • Base origin: ${enhancedCrawl.baseOrigin.city}, ${enhancedCrawl.baseOrigin.state}`);
    console.log(`  • Base destination: ${enhancedCrawl.baseDest.city}, ${enhancedCrawl.baseDest.state}`);
    console.log(`  • Pairs generated: ${enhancedCrawl.pairs.length}`);
    console.log(`  • Expected pairs: 5`);
    
    if (enhancedCrawl.pairs.length > 0) {
      console.log('  • Sample pairs:');
      enhancedCrawl.pairs.slice(0, 3).forEach((pair, i) => {
        console.log(`    ${i+1}. ${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`);
      });
    }

    // Generate rows
    const enhancedRows = rowsFromBaseAndPairs(
      lane, 
      enhancedCrawl.baseOrigin, 
      enhancedCrawl.baseDest, 
      enhancedCrawl.pairs, 
      true, // preferFillTo10
      new Set()
    );
    
    console.log(`  • Rows generated: ${enhancedRows.length}`);
    console.log(`  • Expected rows: 12 (6 postings × 2 contacts)`);
    console.log(`  • Actual postings: ${enhancedRows.length / 2}`);
    console.log('');

    // Test with standard system (preferFillTo10 = false)
    console.log('🔄 STANDARD SYSTEM TEST (preferFillTo10 = false):');
    const standardCrawl = await planPairsForLane(lane, { preferFillTo10: false });
    console.log(`  • Pairs generated: ${standardCrawl.pairs.length}`);
    console.log(`  • Expected pairs: 3`);

    const standardRows = rowsFromBaseAndPairs(
      lane, 
      standardCrawl.baseOrigin, 
      standardCrawl.baseDest, 
      standardCrawl.pairs, 
      false, // preferFillTo10
      new Set()
    );
    
    console.log(`  • Rows generated: ${standardRows.length}`);
    console.log(`  • Expected rows: 8 (4 postings × 2 contacts)`);
    console.log(`  • Actual postings: ${standardRows.length / 2}`);
    console.log('');

    // Summary
    console.log('📊 COMPARISON:');
    console.log(`  • Enhanced system: ${enhancedCrawl.pairs.length} pairs → ${enhancedRows.length} rows`);
    console.log(`  • Standard system: ${standardCrawl.pairs.length} pairs → ${standardRows.length} rows`);
    console.log(`  • Enhancement working: ${enhancedCrawl.pairs.length > standardCrawl.pairs.length ? '✅ YES' : '❌ NO'}`);
    console.log('');

    if (enhancedCrawl.pairs.length < 5) {
      console.log('🚨 ISSUE DETECTED:');
      console.log(`  • Enhanced system only generated ${enhancedCrawl.pairs.length} pairs instead of 5`);
      console.log(`  • This explains why bulk export gave 64 rows instead of 108`);
      console.log(`  • Need to investigate why intelligent fallbacks aren't working`);
    } else {
      console.log('✅ ENHANCED SYSTEM WORKING:');
      console.log(`  • Generated ${enhancedCrawl.pairs.length} pairs as expected`);
      console.log(`  • Issue must be elsewhere in the bulk export process`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSingleLane();
