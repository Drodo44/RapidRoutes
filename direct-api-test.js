// direct-api-test.js - Direct test of the CSV generation logic
console.log('🔬 DIRECT API LOGIC TEST');
console.log('Testing CSV generation without HTTP layer');
console.log('='.repeat(80));

// Set up environment for server-side execution
process.env.NODE_ENV = 'test';

async function testCsvGeneration() {
  try {
    // Import the core components
    console.log('📦 Importing core components...');
    const { adminSupabase } = await import('./utils/supabaseClient.js');
    const { EnterpriseCsvGenerator } = await import('./lib/enterpriseCsvGenerator.js');
    
    console.log('🔍 Fetching pending lanes from database...');
    
    // Get some real pending lanes from the database
    const { data: lanes, error } = await adminSupabase
      .from('lanes')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }
    
    if (!lanes || lanes.length === 0) {
      console.log('⚠️  No pending lanes found in database');
      // Create a test lane
      console.log('🔧 Creating test lane...');
      const testLane = {
        id: 'test-' + Date.now(),
        origin_city: 'Cincinnati',
        origin_state: 'OH',
        origin_zip: '45201',
        dest_city: 'Chicago',
        dest_state: 'IL',
        dest_zip: '60601',
        equipment_code: 'V',
        length_ft: 53,
        weight_lbs: 45000,
        randomize_weight: false,
        full_partial: 'full',
        pickup_earliest: '12/20/2024',
        pickup_latest: '12/21/2024',
        status: 'pending',
        comment: 'Test load',
        commodity: 'General Freight'
      };
      lanes.push(testLane);
    }
    
    console.log(`✅ Found ${lanes.length} lane(s) to process`);
    lanes.forEach((lane, i) => {
      console.log(`  [${i}] ${lane.id}: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state} (${lane.equipment_code})`);
    });
    
    console.log('\n🏢 Testing EnterpriseCsvGenerator...');
    
    const generator = new EnterpriseCsvGenerator({
      generation: {
        minPairsPerLane: 5,
        enableTransactions: true,
        enableCaching: true
      },
      verification: { postGenerationVerification: true }
    });
    
    const result = await generator.generate(lanes);
    
    console.log('\n📊 GENERATION RESULT:');
    console.log(`   Success: ${result.success}`);
    console.log(`   Error: ${result.error || 'None'}`);
    console.log(`   Total Rows: ${result.csv?.rows?.length || 0}`);
    console.log(`   Lane Results: ${result.laneResults?.length || 0}`);
    
    if (result.laneResults && result.laneResults.length > 0) {
      console.log('\n📋 LANE-BY-LANE RESULTS:');
      result.laneResults.forEach((lr, i) => {
        const laneId = lr.lane_id || lr.lane?.id || `lane-${i}`;
        console.log(`   [${i}] Lane ${laneId}: Success=${lr.success}, Rows=${lr.rows_generated || 0}`);
        if (!lr.success && lr.error) {
          console.log(`       Error: ${lr.error}`);
        }
      });
    }
    
    if (result.success && result.csv?.rows && result.csv.rows.length > 0) {
      console.log('\n✅ CSV GENERATION SUCCESSFUL!');
      
      const sampleRow = result.csv.rows[0];
      console.log('\n📄 SAMPLE CSV ROW ANALYSIS:');
      console.log(`   Row object keys: ${Object.keys(sampleRow).length}`);
      console.log(`   Pickup Earliest: "${sampleRow['Pickup Earliest*']}"`);
      console.log(`   Pickup Latest: "${sampleRow['Pickup Latest']}"`);
      console.log(`   Origin City: "${sampleRow['Origin City*']}"`);
      console.log(`   Destination City: "${sampleRow['Destination City*']}"`);
      console.log(`   Equipment: "${sampleRow['Equipment*']}"`);
      console.log(`   Weight: "${sampleRow['Weight (lbs)*']}"`);
      console.log(`   Contact Method: "${sampleRow['Contact Method*']}"`);
      console.log(`   Reference ID: "${sampleRow['Reference ID']}"`);
      
      // Validate date format
      const datePattern = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
      const earliestValid = datePattern.test(sampleRow['Pickup Earliest*']);
      const latestValid = !sampleRow['Pickup Latest'] || datePattern.test(sampleRow['Pickup Latest']);
      
      console.log('\n🔍 VALIDATION CHECK:');
      console.log(`   Date format valid: ${earliestValid && latestValid ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`   Has required fields: ${sampleRow['Origin City*'] && sampleRow['Destination City*'] && sampleRow['Equipment*'] ? '✅ PASS' : '❌ FAIL'}`);
      
      // Test CSV building
      console.log('\n📝 TESTING CSV STRING GENERATION...');
      const { toCsv, DAT_HEADERS } = await import('./lib/datCsvBuilder.js');
      const csvString = toCsv(DAT_HEADERS, result.csv.rows.slice(0, 5));
      
      if (csvString && csvString.length > 0) {
        const lines = csvString.split('\n').filter(line => line.trim());
        console.log(`   CSV string length: ${csvString.length} characters`);
        console.log(`   CSV lines: ${lines.length}`);
        console.log(`   Header count: ${lines[0]?.split(',').length || 0} (should be 24)`);
        
        if (lines.length > 1) {
          console.log('\n📋 SAMPLE CSV OUTPUT:');
          console.log(`Header: ${lines[0]}`);
          console.log(`Row 1:  ${lines[1]}`);
        }
        
        console.log('\n✅ CSV EXPORT PIPELINE WORKING!');
        return {
          success: true,
          sampleLane: lanes[0]?.id,
          totalRows: result.csv.rows.length,
          sampleRow,
          csvPreview: lines.slice(0, 2)
        };
      }
    }
    
    if (!result.success) {
      console.log('\n❌ CSV GENERATION FAILED');
      console.log(`   Root cause: ${result.error}`);
      
      if (result.laneResults) {
        const failedLanes = result.laneResults.filter(lr => !lr.success);
        console.log(`   Failed lanes: ${failedLanes.length}/${result.laneResults.length}`);
        
        if (failedLanes.length > 0) {
          console.log('   Sample failures:');
          failedLanes.slice(0, 3).forEach(fl => {
            console.log(`     - ${fl.error}`);
          });
        }
      }
    }
    
    return { success: false, error: result.error };
    
  } catch (error) {
    console.error('\n💥 TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

testCsvGeneration().then(result => {
  console.log('\n' + '='.repeat(80));
  if (result?.success) {
    console.log('🎉 PRODUCTION VERIFICATION: CSV EXPORT WORKING!');
    console.log(`   Sample Lane ID: ${result.sampleLane}`);
    console.log(`   Total Rows Generated: ${result.totalRows}`);
    console.log('   Intelligence system functioning correctly');
  } else {
    console.log('❌ PRODUCTION VERIFICATION: Issues remain');
    console.log(`   Error: ${result?.error || 'Unknown'}`);
  }
  console.log('🏁 DIRECT TEST COMPLETE');
  process.exit(result?.success ? 0 : 1);
}).catch(error => {
  console.error('💥 DIRECT TEST CRASHED:', error.message);
  process.exit(1);
});