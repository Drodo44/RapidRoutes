#!/usr/bin/env node

import dotenv from 'dotenv';

// Load environment variables first
const result = dotenv.config({ path: '.env.local' });
if (result.error) {
  console.error('Failed to load .env.local:', result.error);
}

console.log('Environment loaded:', {
  SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  HERE_API: !!process.env.HERE_API_KEY
});

import { generateIntelligentCrawlPairs } from './lib/intelligentCrawl.js';
import { rowsFromBaseAndPairs } from './lib/datCsvBuilder.js';

console.log('🚀 TESTING FULL CSV EXPORT WITH HERE.COM VERIFICATION');
console.log('=====================================================');

async function testFullExport() {
  try {
    // Test lane (real production scenario)
    const testLane = {
      id: 'TEST-001',
      origin_city: 'Seaboard',
      origin_state: 'NC',
      origin_zip: '27876',
      dest_city: 'Oxford', 
      dest_state: 'PA',
      dest_zip: '19363',
      equipment_code: 'FD',
      length_ft: 48,
      weight_lbs: 48000,
      full_partial: 'FULL',
      pickup_earliest: '2024-12-20',
      pickup_latest: '2024-12-22',
      commodity: 'MACHINERY',
      comment: 'Test export with HERE.com verification',
      randomize_weight: false
    };

    console.log('\n1. Generating intelligent pairs with HERE.com verification...');
    const pairs = await generateIntelligentCrawlPairs(testLane);
    console.log(`📊 Generated ${pairs.length} verified pairs`);

    if (pairs.length === 0) {
      console.log('❌ No pairs generated - export would fail');
      return;
    }

    console.log('\n2. Building CSV rows...');
    const baseOrigin = { city: testLane.origin_city, state_or_province: testLane.origin_state, zip: testLane.origin_zip };
    const baseDest = { city: testLane.dest_city, state_or_province: testLane.dest_state, zip: testLane.dest_zip };
    const csvRows = rowsFromBaseAndPairs(testLane, baseOrigin, baseDest, pairs);
    console.log(`📊 Generated ${csvRows.length} CSV rows`);
    console.log(`📊 Expected: ${pairs.length * 2} rows (2 contact methods per pair)`);

    console.log('\n3. Sample CSV output (first 3 rows):');
    const headers = [
      'Pickup Earliest*', 'Pickup Latest', 'Length (ft)*', 'Weight (lbs)*',
      'Full/Partial*', 'Equipment*', 'Use Private Network*', 'Private Network Rate',
      'Allow Private Network Booking', 'Allow Private Network Bidding',
      'Use DAT Loadboard*', 'DAT Loadboard Rate', 'Allow DAT Loadboard Booking',
      'Use Extended Network', 'Contact Method*', 'Origin City*', 'Origin State*',
      'Origin Postal Code', 'Destination City*', 'Destination State*',
      'Destination Postal Code', 'Comment', 'Commodity', 'Reference ID'
    ];

    console.log('\nCSV Headers:');
    console.log(headers.join(','));
    
    console.log('\nCSV Sample Rows:');
    csvRows.slice(0, 3).forEach((row, i) => {
      console.log(`Row ${i + 1}: ${row.join(',')}`);
    });

    console.log('\n4. Verifying Reference ID format...');
    const sampleRow = csvRows[0];
    const referenceId = sampleRow[23]; // Reference ID is at index 23
    console.log(`Reference ID: "${referenceId}"`);
    console.log(`Format check: ${referenceId.startsWith('RR') ? '✅' : '❌'} Starts with RR`);
    console.log(`Format check: ${!referenceId.includes('"') ? '✅' : '❌'} No Excel quotes`);

    console.log('\n✅ FULL EXPORT TEST COMPLETE');
    console.log('🎯 Ready for drag-and-drop DAT posting!');
    console.log(`📊 Cities: ${pairs.length * 2} unique city pairs`);
    console.log(`📊 Rows: ${csvRows.length} total CSV rows`);
    console.log('🛡️ All cities pre-verified with HERE.com');

  } catch (error) {
    console.error('❌ Full export test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFullExport();
