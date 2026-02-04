import { EnterpriseCsvGenerator } from './lib/enterpriseCsvGenerator.js';
import { adminSupabase } from './utils/supabaseClient.js';

async function testCsvGeneration() {
  console.log('🔄 DIRECT CSV GENERATION TEST');
  console.log('Testing EnterpriseCsvGenerator with pending lanes');
  console.log('');

  try {
    // First get pending lanes
    console.log('📊 Fetching pending lanes...');
    const { data: lanes, error: dbError } = await adminSupabase
      .from('lanes')
      .select('*')
  .eq('lane_status', 'pending');

    if (dbError) {
      console.error('❌ Database query failed:', dbError);
      return;
    }

    console.log(`Found ${lanes.length} pending lanes`);
    
    // Show lanes with their date status
    lanes.forEach((lane, i) => {
      console.log(`  ${i+1}. Lane ${lane.id}: ${lane.origin_city} → ${lane.dest_city}`);
      console.log(`     pickup_earliest: ${lane.pickup_earliest} (${typeof lane.pickup_earliest})`);
      console.log(`     pickup_latest: ${lane.pickup_latest} (${typeof lane.pickup_latest})`);
    });

    console.log('');
    console.log('⚡ Starting CSV generation...');
    
    const generator = new EnterpriseCsvGenerator({
      generation: {
        minPairsPerLane: 6,
        enableTransactions: true,
        enableCaching: true
      },
      verification: { postGenerationVerification: true }
    });

    const result = await generator.generate(lanes);
    
    console.log('📋 GENERATION RESULTS:');
    console.log(`✅ success: ${result.success}`);
    console.log(`✅ error: ${result.error}`);
    
    const allRows = result.csv?.rows || [];
    console.log(`✅ totalRows: ${allRows.length}`);
    console.log(`✅ hasData: ${allRows.length > 0}`);
    
    if (allRows.length > 0) {
      // Check first data row for date format
      const firstRow = allRows[0];
      const pickupEarliest = firstRow[0];
      const pickupLatest = firstRow[1];
      
      console.log('');
      console.log('📅 DATE FORMAT CHECK:');
      console.log(`First row pickup_earliest: "${pickupEarliest}"`);
      console.log(`First row pickup_latest: "${pickupLatest}"`);
      
      // Check if dates are in MM/DD/YYYY format
      const mmddyyyyRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
      const earliestValid = mmddyyyyRegex.test(pickupEarliest);
      const latestValid = mmddyyyyRegex.test(pickupLatest);
      
      console.log(`✅ pickup_earliest MM/DD/YYYY format: ${earliestValid}`);
      console.log(`✅ pickup_latest MM/DD/YYYY format: ${latestValid}`);
      
      // Show first few rows
      console.log('');
      console.log('📄 CSV SAMPLE (first 3 rows):');
      allRows.slice(0, 3).forEach((row, i) => {
        console.log(`${i}: ${row.slice(0, 6).join(', ')}...`);
      });
    }

    // Show lane processing results
    console.log('');
    console.log('🔍 LANE PROCESSING RESULTS:');
    if (result.laneResults) {
      result.laneResults.forEach((laneResult, i) => {
        const status = laneResult.success ? '✅' : '❌';
        console.log(`${status} Lane ${i+1}: ${laneResult.success ? 'SUCCESS' : 'FAILED'}`);
        if (!laneResult.success && laneResult.error) {
          console.log(`    Error: ${laneResult.error}`);
        }
        if (laneResult.debug) {
          console.log(`    Debug: ${laneResult.debug}`);
        }
      });
    }

    // Test summary
    console.log('');
    console.log('🎯 TEST SUMMARY:');
    console.log(`totalRows > 0: ${allRows.length > 0 ? '✅' : '❌'} (${allRows.length})`);
    console.log(`error === null: ${result.error === null ? '✅' : '❌'} (${result.error})`);
    console.log(`success: ${result.success ? '✅' : '❌'}`);
    
    if (allRows.length === 0) {
      console.log('');
      console.log('❌ ZERO ROWS - Check lane processing results above');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testCsvGeneration();