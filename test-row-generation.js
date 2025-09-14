// test-row-generation.js
// Test script to debug row generation without database dependencies

import { generateDatCsvRows, normalizeDatDate } from './lib/datCsvBuilder.js';

// Mock lane that passes validation but might fail row generation
const testLane = {
  id: 'test-lane-001',
  origin_city: 'Atlanta',
  origin_state: 'GA',
  origin_zip: '30309',
  dest_city: 'Charlotte',
  dest_state: 'NC', 
  dest_zip: '28202',
  equipment_code: 'V',
  weight_lbs: 45000,
  randomize_weight: false,
  length_ft: 53,
  full_partial: 'full',
  pickup_earliest: '09/15/2025',
  pickup_latest: '09/16/2025',
  comment: 'Test lane',
  commodity: 'General freight',
  status: 'pending'
};

async function testRowGeneration() {
  console.log('=== TESTING ROW GENERATION ===');
  console.log('Test lane:', testLane);
  
  try {
    console.log('\n--- Starting row generation test ---');
    const rows = await generateDatCsvRows(testLane);
    
    console.log('\n=== RESULT ===');
    console.log(`Success: Generated ${rows.length} rows`);
    if (rows.length > 0) {
      console.log('Sample row keys:', Object.keys(rows[0]));
      console.log('First row:', rows[0]);
    }
    
  } catch (error) {
    console.log('\n=== ERROR ===');
    console.log('Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

testRowGeneration().catch(console.error);