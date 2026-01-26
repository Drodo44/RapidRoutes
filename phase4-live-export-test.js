// phase4-live-export-test.js
// Phase 4: Live Export Testing Mode - End-to-end CSV validation

import { generateDatCsvRows, toCsv, DAT_HEADERS } from './lib/datCsvBuilder.js';
import { adminSupabase } from './utils/supabaseClient.js';

console.log('🚀 PHASE 4: LIVE EXPORT TESTING MODE');
console.log('=====================================');

// Test lane configurations
const testLanes = [
  {
    // Test Lane 1: Cincinnati to Philadelphia (high KMA density corridor)
    origin_city: 'Cincinnati',
    origin_state: 'OH', 
    origin_zip: '45202',
    dest_city: 'Philadelphia',
    dest_state: 'PA',
    dest_zip: '19102',
    equipment_code: 'FD',
    weight_lbs: 45000,
    pickup_earliest: '2025-09-15',
    pickup_latest: '2025-09-17',
    full_partial: 'F',
    commodity: 'Steel Coils',
    comment: 'Phase 4 Test Lane - High KMA Density',
    status: 'pending'
  },
  {
    // Test Lane 2: Atlanta to Chicago (major freight corridor)
    origin_city: 'Atlanta',
    origin_state: 'GA',  
    origin_zip: '30309',
    dest_city: 'Chicago', 
    dest_state: 'IL',
    dest_zip: '60601',
    equipment_code: 'V',
    weight_lbs: 38000,
    pickup_earliest: '2025-09-16',
    pickup_latest: '2025-09-18', 
    full_partial: 'F',
    commodity: 'Electronics',
    comment: 'Phase 4 Test Lane - Major Corridor',
    status: 'pending'
  }
];

async function runPhase4Tests() {
  console.log('📋 Creating test lanes in database...');
  
  // Insert test lanes into database
  const insertedLanes = [];
  for (const [index, laneData] of testLanes.entries()) {
    try {
      const { data: lane, error } = await adminSupabase
        .from('lanes')
        .insert([laneData])
        .select()
        .single();
        
      if (error) throw error;
      
      insertedLanes.push(lane);
      console.log(`✅ Test Lane ${index + 1} inserted: ID ${lane.id}`);
      console.log(`   Route: ${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`);
      console.log(`   Equipment: ${lane.equipment_code}, Weight: ${lane.weight_lbs} lbs`);
      
    } catch (error) {
      console.error(`❌ Failed to insert test lane ${index + 1}:`, error.message);
    }
  }
  
  if (insertedLanes.length === 0) {
    console.error('❌ No test lanes created - aborting test');
    return;
  }
  
  console.log('\n🔄 Testing CSV generation pipeline...');
  
  // Test each lane through the full pipeline
  const testResults = [];
  
  for (const [index, lane] of insertedLanes.entries()) {
    const testResult = {
      laneId: lane.id,
      index: index + 1,
      route: `${lane.origin_city}, ${lane.origin_state} → ${lane.dest_city}, ${lane.dest_state}`,
      equipment: lane.equipment_code,
      status: 'unknown',
      rowsGenerated: 0,
      headersValid: false,
      csvPreview: null,
      error: null,
      intelligencePairs: 0,
      uniqueKmas: 0,
      contactMethods: []
    };
    
    console.log(`\n🧪 Testing Lane ${index + 1}: ${testResult.route}`);
    
    try {
      // Test the CSV generation pipeline 
      console.log('  🔄 Calling generateDatCsvRows...');
      const rows = await generateDatCsvRows(lane);
      
      if (!Array.isArray(rows)) {
        throw new Error(`Invalid rows structure: Expected array, got ${typeof rows}`);
      }
      
      testResult.rowsGenerated = rows.length;
      testResult.intelligencePairs = Math.floor(rows.length / 2); // 2 contact methods per pair
      
      console.log(`  ✅ Generated ${rows.length} rows (${testResult.intelligencePairs} pairs)`);
      
      // Validate minimum row requirement
      if (rows.length < 12) {
        console.log(`  ⚠️  WARNING: Only ${rows.length} rows generated, minimum is 12`);
      }
      
      // Validate row structure
      if (rows.length > 0) {
        const firstRow = rows[0];
        const missingHeaders = DAT_HEADERS.filter(header => !(header in firstRow));
        
        if (missingHeaders.length === 0) {
          testResult.headersValid = true;
          console.log('  ✅ All 24 DAT headers present in row data');
        } else {
          console.log('  ❌ Missing headers:', missingHeaders);
        }
        
        // Analyze contact methods
        const contactMethods = rows.map(row => row['Contact Method*']);
        const uniqueContacts = [...new Set(contactMethods)];
        testResult.contactMethods = uniqueContacts;
        console.log('  📞 Contact methods found:', uniqueContacts);
        
        // Count unique KMAs (approximate - would need to analyze pickup/delivery locations)
        const origins = [...new Set(rows.map(row => `${row['Origin City*']}, ${row['Origin State*']}`))];
        const destinations = [...new Set(rows.map(row => `${row['Destination City*']}, ${row['Destination State*']}`))];
        testResult.uniqueKmas = Math.max(origins.length, destinations.length);
        console.log('  🗺️  Unique origin cities:', origins.length);
        console.log('  🗺️  Unique destination cities:', destinations.length);
      }
      
      // Generate CSV
      console.log('  🔄 Generating CSV...');
      const csv = toCsv(DAT_HEADERS, rows);
      
      if (!csv || typeof csv !== 'string') {
        throw new Error('CSV generation failed - invalid output');
      }
      
      if (csv.startsWith('{') || csv.startsWith('[')) {
        throw new Error('CSV corrupted - contains JSON data');
      }
      
      // Validate CSV structure
      const lines = csv.split('\n').filter(line => line.trim());
      const headerLine = lines[0];
      const headerCount = headerLine.split(',').length;
      
      if (headerCount !== 24) {
        throw new Error(`Invalid header count: ${headerCount}/24`);
      }
      
      // Create CSV preview (headers + first 3 rows)
      const previewLines = lines.slice(0, 4); // Header + 3 data rows
      testResult.csvPreview = previewLines.join('\n');
      
      testResult.status = 'success';
      console.log(`  ✅ CSV generated successfully (${csv.length} characters)`);
      console.log(`  📊 CSV structure: ${headerCount} headers, ${lines.length - 1} data rows`);
      
    } catch (error) {
      testResult.status = 'failed';
      testResult.error = error.message;
      console.log(`  ❌ Test failed: ${error.message}`);
    }
    
    testResults.push(testResult);
  }
  
  // Display comprehensive test results
  console.log('\n📊 PHASE 4 TEST RESULTS SUMMARY');
  console.log('===============================');
  
  const successful = testResults.filter(r => r.status === 'success');
  const failed = testResults.filter(r => r.status === 'failed');
  
  console.log(`Total lanes tested: ${testResults.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Success rate: ${((successful.length / testResults.length) * 100).toFixed(1)}%`);
  
  // Display detailed results for each lane
  testResults.forEach(result => {
    console.log(`\n🧪 Lane ${result.index}: ${result.route}`);
    console.log(`   Status: ${result.status === 'success' ? '✅' : '❌'} ${result.status.toUpperCase()}`);
    console.log(`   Equipment: ${result.equipment}`);
    
    if (result.status === 'success') {
      console.log(`   Rows generated: ${result.rowsGenerated}`);
      console.log(`   Intelligence pairs: ${result.intelligencePairs}`);
      console.log(`   Headers valid: ${result.headersValid ? '✅' : '❌'}`);
      console.log(`   Contact methods: ${result.contactMethods.join(', ')}`);
      console.log(`   Unique KMAs: ~${result.uniqueKmas}`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  // Display CSV preview for first successful lane
  const firstSuccess = successful[0];
  if (firstSuccess && firstSuccess.csvPreview) {
    console.log('\n📄 SAMPLE CSV OUTPUT PREVIEW');
    console.log('============================');
    console.log(`Lane: ${firstSuccess.route}`);
    console.log(`Equipment: ${firstSuccess.equipment}`);
    console.log('');
    console.log(firstSuccess.csvPreview);
    console.log('');
    console.log(`... (${firstSuccess.rowsGenerated - 3} additional rows) ...`);
  }
  
  // Clean up test lanes
  console.log('\n🧹 Cleaning up test lanes...');
  for (const lane of insertedLanes) {
    try {
      await adminSupabase
        .from('lanes')
        .delete()
        .eq('id', lane.id);
      console.log(`✅ Deleted test lane ${lane.id}`);
    } catch (error) {
      console.log(`⚠️  Warning: Could not delete test lane ${lane.id}:`, error.message);
    }
  }
  
  console.log('\n🎯 PHASE 4 TESTING COMPLETE');
  return testResults;
}

// Run the test
runPhase4Tests().catch(console.error);