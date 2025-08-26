import { planPairsForLane, rowsFromBaseAndPairs } from './lib/datCsvBuilder.js';
import { adminSupabase } from './utils/supabaseClient.js';

async function testActualExportFailure() {
  console.log('🧪 TESTING WHY CSV EXPORT IS BLANK\n');
  
  // Get a pending lane to test with
  const { data: lanes } = await adminSupabase
    .from('lanes')
    .select('*')
    .eq('status', 'pending')
    .limit(1);
    
  if (!lanes || lanes.length === 0) {
    console.log('❌ No pending lanes found for testing');
    return;
  }
  
  const lane = lanes[0];
  console.log(`🔄 Testing export with lane:`);
  console.log(`   ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
  console.log(`   Equipment: ${lane.equipment_code} | Weight: ${lane.weight_lbs} | ID: ${lane.id}`);
  
  try {
    console.log('\n🔄 STEP 1: Running planPairsForLane...');
    const crawl = await planPairsForLane(lane, { preferFillTo10: true });
    
    console.log('✅ Crawl completed:');
    console.log(`   Base origin: ${crawl.baseOrigin?.city}, ${crawl.baseOrigin?.state}`);
    console.log(`   Base dest: ${crawl.baseDest?.city}, ${crawl.baseDest?.state}`);  
    console.log(`   Pairs found: ${crawl.pairs?.length || 0}`);
    
    if (!crawl.pairs || crawl.pairs.length === 0) {
      console.log('🚨 PROBLEM FOUND: NO PAIRS GENERATED');
      console.log('   This means the geographic crawl is failing');
      console.log('   Checking why...');
      
      // Try to understand why pairs failed
      if (crawl.shortfallReason) {
        console.log(`   Shortfall reason: ${crawl.shortfallReason}`);
      }
      
      if (crawl.method) {
        console.log(`   Method used: ${crawl.method}`);
      }
      
      return;
    }
    
    // Show generated pairs
    console.log('   Generated pairs:');
    crawl.pairs.forEach((pair, i) => {
      console.log(`     ${i+1}. ${pair.pickup?.city}, ${pair.pickup?.state} → ${pair.delivery?.city}, ${pair.delivery?.state}`);
    });
    
    console.log('\n🔄 STEP 2: Running rowsFromBaseAndPairs...');
    const usedRefIds = new Set();
    const rows = rowsFromBaseAndPairs(lane, crawl.baseOrigin, crawl.baseDest, crawl.pairs, true, usedRefIds);
    
    console.log(`✅ Rows generated: ${rows.length}`);
    console.log(`   Expected: 12 rows (6 postings × 2 contacts)`);
    
    if (rows.length === 0) {
      console.log('🚨 PROBLEM FOUND: ZERO ROWS GENERATED');
      console.log('   Even with pairs, no rows were created');
    } else if (rows.length < 12) {
      console.log('⚠️ Partial rows generated - may cause issues');
    } else {
      console.log('✅ Full row set generated - export should work');
    }
    
    // Show sample row data
    if (rows.length > 0) {
      console.log('\n📋 Sample row data:');
      const row = rows[0];
      console.log(`   Origin: ${row['Origin City*']}, ${row['Origin State*']}`);
      console.log(`   Destination: ${row['Destination City*']}, ${row['Destination State*']}`);
      console.log(`   Equipment: ${row['Equipment*']}`);
      console.log(`   Weight: ${row['Weight (lbs)*']}`);
      console.log(`   Contact: ${row['Contact Method*']}`);
    }
    
  } catch (error) {
    console.error('💥 ERROR DURING EXPORT TEST:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    console.log('\n🚨 This error explains why your CSV is blank!');
  }
}

testActualExportFailure();
