#!/usr/bin/env node

import { adminSupabase } from './utils/supabaseClient.js';

async function testActualExport() {
  try {
    console.log('🧪 Testing actual CSV export process...\n');
    
    // Get one pending lane
    const { data: lanes, error } = await adminSupabase
      .from('lanes')
      .select('*')
      .eq('status', 'pending')
      .limit(1);
    
    if (error || !lanes?.length) {
      console.error('Error getting test lane:', error);
      return;
    }
    
    const lane = lanes[0];
    console.log('🎯 Test lane:', {
      id: lane.id,
      origin: `${lane.origin_city}, ${lane.origin_state}`,
      dest: `${lane.dest_city}, ${lane.dest_state}`,
      weight_lbs: lane.weight_lbs,
      randomize_weight: lane.randomize_weight,
      weight_min: lane.weight_min,
      weight_max: lane.weight_max,
      equipment: lane.equipment_code
    });
    
    // Import the actual generation functions
    const { planPairsForLane, rowsFromBaseAndPairs } = await import('./lib/datCsvBuilder.js');
    
    console.log('\n🔄 Running planPairsForLane...');
    
    // Test the pair generation
    const crawl = await planPairsForLane(lane, { preferFillTo10: true });
    
    console.log('✅ Crawl result:', {
      baseOrigin: crawl.baseOrigin,
      baseDest: crawl.baseDest,
      pairsCount: crawl.pairs?.length || 0,
      pairs: crawl.pairs?.slice(0, 3).map(p => `${p.pickup.city}, ${p.pickup.state} -> ${p.delivery.city}, ${p.delivery.state}`)
    });
    
    console.log('\n🔄 Running rowsFromBaseAndPairs...');
    
    // Test the row generation
    const rows = rowsFromBaseAndPairs(lane, crawl.baseOrigin, crawl.baseDest, crawl.pairs, true);
    
    console.log(`✅ Generated ${rows.length} rows`);
    
    // Show sample of what was generated
    console.log('\n📊 Sample rows:');
    rows.slice(0, 4).forEach((row, i) => {
      console.log(`Row ${i+1}: ${row['Contact Method*']} - ${row['Origin City*']}, ${row['Origin State*']} -> ${row['Destination City*']}, ${row['Destination State*']}`);
    });
    
    // Check for duplicates
    const uniquePairs = new Set();
    const duplicates = [];
    
    rows.forEach((row, i) => {
      const pairKey = `${row['Origin City*']},${row['Origin State*']}->${row['Destination City*']},${row['Destination State*']}`;
      if (uniquePairs.has(pairKey)) {
        duplicates.push(`Row ${i+1}: ${pairKey}`);
      }
      uniquePairs.add(pairKey);
    });
    
    console.log(`\n🔍 Unique city pairs: ${uniquePairs.size}`);
    console.log(`⚠️ Expected pairs: ${rows.length / 2} (${rows.length} rows ÷ 2 contact methods)`);
    
    if (duplicates.length > 0) {
      console.log(`❌ Found ${duplicates.length} duplicate pairs:`);
      duplicates.slice(0, 5).forEach(dup => console.log(`   ${dup}`));
    }
    
  } catch (error) {
    console.error('❌ Export test failed:', error);
    console.error(error.stack);
  }
}

testActualExport();
