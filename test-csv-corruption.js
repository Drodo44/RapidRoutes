// test-csv-corruption.js
// Direct test to reproduce CSV corruption issue

import { generateDatCsvRows, toCsv, DAT_HEADERS } from './lib/datCsvBuilder.js';

async function testCsvCorruption() {
  console.log('🚨 TESTING CSV CORRUPTION ISSUE');
  console.log('================================');
  
  // Create a test lane (similar to what would come from database)
  const testLane = {
    id: 'test-lane-001',
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
    commodity: 'Test Freight',
    comment: 'Test lane for debugging'
  };

  try {
    console.log('📋 Test lane:', testLane);
    console.log('');
    
    console.log('🔄 Calling generateDatCsvRows...');
    const rows = await generateDatCsvRows(testLane);
    
    console.log('');
    console.log('✅ generateDatCsvRows returned:');
    console.log('  Type:', typeof rows);
    console.log('  Is Array:', Array.isArray(rows));
    console.log('  Length:', rows?.length);
    
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('  First row keys:', Object.keys(rows[0]));
      console.log('  Sample row:', rows[0]);
    }
    
    console.log('');
    console.log('🔄 Calling toCsv...');
    const csv = toCsv(DAT_HEADERS, rows);
    
    console.log('');
    console.log('✅ toCsv returned:');
    console.log('  Type:', typeof csv);
    console.log('  Length:', csv?.length);
    console.log('  First 500 chars:', csv?.substring(0, 500));
    
    // Check if CSV starts with JSON
    if (csv.startsWith('{') || csv.startsWith('[')) {
      console.log('❌ CORRUPTION DETECTED: CSV starts with JSON!');
    } else {
      console.log('✅ CSV looks normal - starts with headers');
    }
    
  } catch (error) {
    console.log('');
    console.log('❌ ERROR during CSV generation:');
    console.log('  Error type:', typeof error);
    console.log('  Error message:', error.message);
    console.log('  Error stack:', error.stack);
    
    // Check if this error could be serialized as JSON to CSV
    console.log('');
    console.log('🔍 JSON serialization of error:');
    console.log(JSON.stringify({
      message: error.message,
      error: error.toString(),
      stack: error.stack
    }, null, 2));
  }
}

// Run the test
testCsvCorruption().catch(console.error);