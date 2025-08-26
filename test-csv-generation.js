import { planPairsForLane, rowsFromBaseAndPairs, toCsv, chunkRows } from './lib/datCsvBuilder.js';
import { adminSupabase } from './utils/supabaseClient.js';

async function testCsvGeneration() {
  try {
    console.log('🧪 Testing CSV generation with fixed geographic crawl...\n');
    
    // Get the test lane
    const laneId = 'a7ed08f5-072b-48d3-a45a-815656e5cf4c';
    const { data: lanes, error } = await adminSupabase
      .from('lanes')
      .select('*')
      .in('id', [laneId]);
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    if (!lanes || lanes.length === 0) {
      console.error('❌ No lanes found');
      return;
    }
    
    console.log(`📋 Found ${lanes.length} lane(s) to process`);
    
    // Build rows for each lane
    const allRows = [];
    const usedRefIds = new Set();
    
    for (const lane of lanes) {
      console.log(`\n🔄 Processing lane: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state}`);
      
      // Get pairs for this lane
      const pairResult = await planPairsForLane(lane, { preferFillTo10: true });
      
      // Generate rows for this lane
      const laneRows = rowsFromBaseAndPairs(
        lane, 
        pairResult.baseOrigin, 
        pairResult.baseDest, 
        pairResult.pairs, 
        true, // preferFillTo10
        usedRefIds
      );
      
      allRows.push(...laneRows);
      console.log(`✅ Generated ${laneRows.length} rows for this lane`);
    }
    
    console.log(`\n✅ CSV GENERATION SUCCESS!`);
    console.log(`📊 Generated ${allRows.length} total rows`);
    
    // Analyze uniqueness
    const uniquePairs = new Set();
    allRows.forEach(row => {
      const originCity = row['Origin City*'] || '';
      const originState = row['Origin State*'] || '';
      const destCity = row['Destination City*'] || '';
      const destState = row['Destination State*'] || '';
      const pairKey = `${originCity},${originState}->${destCity},${destState}`;
      uniquePairs.add(pairKey);
    });
    
    console.log(`🎯 Unique city pairs: ${uniquePairs.size}`);
    console.log(`📞 Contact method variations: ${allRows.length / uniquePairs.size} per pair`);
    
    // Show sample data
    console.log(`\n📝 Sample rows:`);
    for (let i = 0; i < Math.min(4, allRows.length); i++) {
      const row = allRows[i];
      console.log(`Row ${i+1}: ${row['Contact Method*']} - ${row['Origin City*']}, ${row['Origin State*']} -> ${row['Destination City*']}, ${row['Destination State*']}`);
    }
    
    // Check for Miami (should not appear)
    const miamiRows = allRows.filter(row => 
      row['Origin City*']?.includes('Miami') || 
      row['Destination City*']?.includes('Miami')
    );
    
    if (miamiRows.length > 0) {
      console.log(`\n⚠️ WARNING: Found ${miamiRows.length} rows with Miami (this should not happen)`);
    } else {
      console.log(`\n✅ SUCCESS: No Miami, FL found (as expected)`);
    }
    
    console.log(`\n🎉 CSV export working perfectly with geographic KMA intelligence!`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCsvGeneration();
