import { adminSupabase } from './utils/supabaseClient.js';

async function testLiveCsvExport() {
  console.log('🔄 LIVE CSV EXPORT TEST - Testing /api/exportDatCsv?pending=1');
  console.log('Expected: totalRows > 0, error === null, MM/DD/YYYY dates');
  console.log('');

  try {
    // First, check what pending lanes we have
    console.log('📊 Checking pending lanes in database...');
    const { data: lanes, error: dbError } = await adminSupabase
      .from('lanes')
      .select('id, pickup_earliest, pickup_latest, origin_city, dest_city, equipment_code, weight_lbs')
      .eq('status', 'pending')
      .limit(5);

    if (dbError) {
      console.error('❌ Database query failed:', dbError);
      return;
    }

    console.log(`Found ${lanes.length} pending lanes:`);
    lanes.forEach((lane, i) => {
      console.log(`  ${i+1}. Lane ${lane.id}: ${lane.origin_city} → ${lane.dest_city}`);
      console.log(`     pickup_earliest: ${lane.pickup_earliest} (type: ${typeof lane.pickup_earliest})`);
      console.log(`     pickup_latest: ${lane.pickup_latest} (type: ${typeof lane.pickup_latest})`);
      console.log(`     equipment: ${lane.equipment_code}, weight: ${lane.weight_lbs}`);
    });
    console.log('');

    // Now test the actual API endpoint
    console.log('🚀 Testing /api/exportDatCsv?pending=1...');
    
    const response = await fetch('http://localhost:3000/api/exportDatCsv?pending=1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      console.log('❌ HTTP Error Response');
      const errorText = await response.text();
      console.log('Error body:', errorText);
      return;
    }

    const result = await response.json();
    console.log('');
    console.log('📋 EXPORT RESULTS:');
    console.log(`✅ totalRows: ${result.totalRows}`);
    console.log(`✅ error: ${result.error}`);
    console.log(`✅ hasData: ${result.totalRows > 0}`);
    
    if (result.csvData) {
      const lines = result.csvData.split('\n');
      console.log(`✅ CSV lines: ${lines.length}`);
      
      // Check first data row for date format
      if (lines.length > 1 && lines[1].trim()) {
        const firstDataRow = lines[1].split(',');
        const pickupEarliest = firstDataRow[0];
        const pickupLatest = firstDataRow[1];
        
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
      }
      
      // Show first few lines of CSV
      console.log('');
      console.log('📄 CSV SAMPLE (first 3 lines):');
      lines.slice(0, 3).forEach((line, i) => {
        console.log(`${i}: ${line}`);
      });
    }

    // Test summary
    console.log('');
    console.log('🎯 TEST SUMMARY:');
    console.log(`totalRows > 0: ${result.totalRows > 0 ? '✅' : '❌'} (${result.totalRows})`);
    console.log(`error === null: ${result.error === null ? '✅' : '❌'} (${result.error})`);
    console.log(`Response OK: ${response.ok ? '✅' : '❌'} (${response.status})`);
    
    if (result.totalRows === 0) {
      console.log('');
      console.log('❌ ZERO ROWS - Need to check debug logs from server');
      console.log('The auto-default fix may not be working or validation is still failing');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testLiveCsvExport();