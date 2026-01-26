// simple-diagnostic.js
// Lightweight diagnostic that uses test mode to bypass database requirements
// This will help identify the actual export pipeline issue

console.log('🔬 SIMPLE EXPORT PIPELINE DIAGNOSTIC (TEST MODE)');
console.log('='.repeat(80));

// Set test mode environment
process.env.TEST_MODE_SIMPLE_ROWS = '1';
process.env.NODE_ENV = 'test';

async function runSimpleDiagnostic() {
  console.log('\n📦 Testing with mock lane data...');
  
  // Create mock lane data that matches database schema
  const mockLanes = [
    {
      id: 'test-lane-1',
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
      pickup_earliest: '12/18/2024',
      pickup_latest: '12/19/2024',
      status: 'pending',
      comment: 'Test load',
      commodity: 'General Freight'
    },
    {
      id: 'test-lane-2',
      origin_city: 'Atlanta',
      origin_state: 'GA',
      origin_zip: '30301',
      dest_city: 'Dallas',
      dest_state: 'TX',
      dest_zip: '75201',
      equipment_code: 'FD',
      length_ft: 48,
      weight_lbs: null,
      randomize_weight: true,
      weight_min: 40000,
      weight_max: 48000,
      full_partial: 'full',
      pickup_earliest: '12/20/2024',
      pickup_latest: '12/21/2024',
      status: 'pending',
      comment: 'Flatbed test',
      commodity: 'Steel'
    },
    {
      id: 'test-lane-3',
      origin_city: 'Los Angeles',
      origin_state: 'CA',
      origin_zip: '90001',
      dest_city: 'Phoenix',
      dest_state: 'AZ',
      dest_zip: '85001',
      equipment_code: 'R',
      length_ft: 53,
      weight_lbs: 42000,
      randomize_weight: false,
      full_partial: 'partial',
      pickup_earliest: null, // Test null date handling
      pickup_latest: null,
      status: 'pending',
      comment: 'Reefer test',
      commodity: 'Produce'
    }
  ];

  console.log(`✅ Created ${mockLanes.length} mock lanes for testing`);
  mockLanes.forEach((lane, i) => {
    console.log(`  [${i}] ${lane.id}: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state} (${lane.equipment_code})`);
  });

  // Test EnterpriseCsvGenerator with simple mode
  console.log('\n🏢 Testing EnterpriseCsvGenerator in test mode...');
  
  try {
    const { EnterpriseCsvGenerator } = await import('./lib/enterpriseCsvGenerator.js');
    
    const generator = new EnterpriseCsvGenerator({
      generation: {
        minPairsPerLane: 3, // Lower requirement for testing
        enableTransactions: true,
        enableCaching: true
      },
      verification: { postGenerationVerification: true }
    });

    const result = await generator.generate(mockLanes);
    
    console.log('\n📊 ENTERPRISE GENERATOR RESULT:');
    console.log('  Success:', result.success);
    console.log('  Error:', result.error);
    console.log('  Total rows:', result.csv?.rows?.length || 0);
    console.log('  Lane results count:', result.laneResults?.length || 0);
    
    if (result.laneResults) {
      console.log('\n📋 LANE-BY-LANE RESULTS:');
      result.laneResults.forEach((lr, i) => {
        console.log(`  [${i}] Lane ${lr.lane_id || lr.lane?.id}: Success=${lr.success}, Rows=${lr.rows_generated || 0}`);
        if (!lr.success) {
          console.log(`      Error: ${lr.error}`);
        }
      });
    }

    if (result.csv?.rows && result.csv.rows.length > 0) {
      console.log('\n📄 SAMPLE CSV ROW:');
      const sampleRow = result.csv.rows[0];
      console.log('  Headers present:', Object.keys(sampleRow).length);
      console.log('  Required fields:');
      console.log('    Pickup Earliest:', sampleRow['Pickup Earliest*']);
      console.log('    Origin City:', sampleRow['Origin City*']);
      console.log('    Destination City:', sampleRow['Destination City*']);
      console.log('    Equipment:', sampleRow['Equipment*']);
      console.log('    Weight:', sampleRow['Weight (lbs)*']);
      console.log('    Contact Method:', sampleRow['Contact Method*']);
    }

    // Test individual lane generation
    console.log('\n🧪 Testing individual lane CSV generation...');
    
    for (let i = 0; i < Math.min(mockLanes.length, 2); i++) {
      const lane = mockLanes[i];
      console.log(`\n  Testing Lane ${lane.id}:`);
      
      try {
        const { generateDatCsvRows } = await import('./lib/datCsvBuilder.js');
        const rows = await generateDatCsvRows(lane);
        
        if (Array.isArray(rows)) {
          console.log(`    ✅ Generated ${rows.length} CSV rows`);
          if (rows.length > 0) {
            console.log(`    First row keys: ${Object.keys(rows[0]).length} headers`);
          }
        } else {
          console.log(`    ❌ Non-array result: ${typeof rows}`);
        }
        
      } catch (error) {
        console.log(`    ❌ Generation failed: ${error.message}`);
      }
    }

    // Determine root cause
    console.log('\n🎯 DIAGNOSTIC ANALYSIS:');
    console.log('-'.repeat(50));
    
    if (!result.success) {
      console.log('❌ ROOT CAUSE: EnterpriseCsvGenerator failed');
      console.log('   Error:', result.error);
      
      if (result.laneResults) {
        const failedLanes = result.laneResults.filter(lr => !lr.success);
        const successfulLanes = result.laneResults.filter(lr => lr.success);
        
        console.log(`   Failed lanes: ${failedLanes.length}/${result.laneResults.length}`);
        console.log(`   Successful lanes: ${successfulLanes.length}/${result.laneResults.length}`);
        
        if (failedLanes.length > 0) {
          console.log('   Sample failure reasons:');
          failedLanes.slice(0, 3).forEach(fl => {
            console.log(`     - ${fl.error}`);
          });
        }
      }
    } else if (!result.csv?.rows || result.csv.rows.length === 0) {
      console.log('❌ ROOT CAUSE: Generator succeeded but produced 0 rows');
    } else {
      console.log('✅ PIPELINE APPEARS HEALTHY: Generated CSV rows successfully');
      console.log('   Issue likely in API endpoint logic or request handling');
    }

    return result;

  } catch (error) {
    console.error('💥 DIAGNOSTIC FAILED:', error.message);
    console.error('Stack trace:', error.stack);
    return null;
  }
}

// Run the diagnostic
runSimpleDiagnostic().then(result => {
  console.log('\n' + '='.repeat(80));
  console.log('🔬 DIAGNOSTIC COMPLETE');
  
  if (!result) {
    console.log('❌ Unable to complete diagnostic due to errors');
  } else if (!result.success) {
    console.log('❌ Export pipeline has issues - see analysis above');
  } else if (!result.csv?.rows || result.csv.rows.length === 0) {
    console.log('❌ Export pipeline succeeded but generated 0 rows');
  } else {
    console.log('✅ Export pipeline appears functional - investigate API layer');
  }
  
  process.exit(0);
}).catch(error => {
  console.error('💥 DIAGNOSTIC SCRIPT CRASHED:', error.message);
  process.exit(1);
});