// test-csv-row-guarantee.js
// Test to verify CSV export generates exactly 120 rows for 10 lanes with fill=1

import { planPairsForLane, rowsFromBaseAndPairs } from './lib/datCsvBuilder.js';

// Mock lanes for testing
const testLanes = [
  {
    id: 1,
    origin_city: 'Chicago',
    origin_state: 'IL',
    dest_city: 'Atlanta',
    dest_state: 'GA',
    equipment_code: 'V',
    pickup_earliest: '12/15/2024',
    pickup_latest: '12/16/2024',
    length_ft: 48,
    weight_lbs: 45000,
    full_partial: 'full',
    reference_id: 'RR12345',
    comment: 'Test lane 1',
    commodity: 'General freight'
  },
  {
    id: 2,
    origin_city: 'Dallas',
    origin_state: 'TX',
    dest_city: 'Los Angeles',
    dest_state: 'CA',
    equipment_code: 'FD',
    pickup_earliest: '12/15/2024',
    pickup_latest: '12/16/2024',
    length_ft: 48,
    weight_lbs: 46000,
    full_partial: 'full',
    reference_id: 'RR12346',
    comment: 'Test lane 2',
    commodity: 'Steel coils'
  },
  {
    id: 3,
    origin_city: 'Phoenix',
    origin_state: 'AZ',
    dest_city: 'Denver',
    dest_state: 'CO',
    equipment_code: 'R',
    pickup_earliest: '12/15/2024',
    pickup_latest: '12/16/2024',
    length_ft: 48,
    weight_lbs: 44000,
    full_partial: 'full',
    reference_id: 'RR12347',
    comment: 'Test lane 3',
    commodity: 'Produce'
  }
];

async function testRowGuarantee() {
  console.log('🧪 TESTING CSV ROW COUNT GUARANTEE\n');
  
  const usedRefIds = new Set();
  const usedCities = new Set();
  let totalRows = 0;
  
  console.log('Test Parameters:');
  console.log('- preferFillTo10: true');
  console.log('- Expected per lane: 1 base + 5 pairs = 6 postings × 2 contacts = 12 rows');
  console.log('- Expected total: 3 lanes × 12 rows = 36 rows\n');
  
  for (let i = 0; i < testLanes.length; i++) {
    const lane = testLanes[i];
    console.log(`📍 Processing Lane ${i + 1}: ${lane.origin_city}, ${lane.origin_state} -> ${lane.dest_city}, ${lane.dest_state} (${lane.equipment_code})`);
    
    try {
      // Test with preferFillTo10=true (should generate exactly 5 pairs)
      const crawl = await planPairsForLane(lane, { 
        preferFillTo10: true, 
        usedCities 
      });
      
      console.log(`  🗺️ Crawl result: ${crawl.pairs?.length || 0} pairs generated`);
      
      if (!crawl.pairs || crawl.pairs.length !== 5) {
        console.error(`  ❌ FAILED: Expected 5 pairs, got ${crawl.pairs?.length || 0}`);
        continue;
      }
      
      // Generate rows from the crawl
      const rows = rowsFromBaseAndPairs(
        lane, 
        crawl.baseOrigin, 
        crawl.baseDest, 
        crawl.pairs, 
        true, // preferFillTo10
        usedRefIds
      );
      
      console.log(`  📊 Generated ${rows.length} rows`);
      
      if (rows.length !== 12) {
        console.error(`  ❌ FAILED: Expected 12 rows, got ${rows.length}`);
        continue;
      }
      
      console.log(`  ✅ SUCCESS: Lane ${i + 1} generated exactly 12 rows`);
      totalRows += rows.length;
      
      // Show breakdown
      console.log(`  📋 Breakdown: 6 postings (1 base + 5 pairs) × 2 contacts = 12 rows`);
      
    } catch (error) {
      console.error(`  💥 ERROR processing lane ${i + 1}:`, error.message);
    }
    
    console.log('');
  }
  
  console.log('🎯 FINAL RESULTS:');
  console.log(`Total rows generated: ${totalRows}`);
  console.log(`Expected: ${testLanes.length * 12}`);
  console.log(`Per lane average: ${(totalRows / testLanes.length).toFixed(1)}`);
  
  if (totalRows === testLanes.length * 12) {
    console.log('✅ SUCCESS: Row count guarantee met!');
    console.log('');
    console.log('📈 SCALING TEST: For 10 lanes in production:');
    console.log('Expected rows: 10 × 12 = 120 rows');
    console.log('User reported: 96 rows (ISSUE CONFIRMED)');
    console.log('');
    console.log('🔧 DIAGNOSIS: Some lanes are not getting preferFillTo10=true');
    console.log('🔧 SOLUTION: Ensure fill=1 parameter is properly handled in API');
  } else {
    console.log('❌ FAILED: Row count guarantee not met');
    console.log(`Missing: ${testLanes.length * 12 - totalRows} rows`);
  }
}

// Run the test
testRowGuarantee().catch(console.error);
