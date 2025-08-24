#!/usr/bin/env node

import { generateDatCsv } from './lib/generateDatCsv.js';

async function testCsvExport() {
  console.log('🧪 Testing CSV Export Generation...\n');
  
  // Mock lane data similar to what would come from database
  const mockLane = {
    id: 1,
    origin_city: 'Atlanta',
    origin_state: 'GA', 
    origin_zip: '30309',
    dest_city: 'Nashville', 
    dest_state: 'TN',
    dest_zip: '37203',
    equipment_code: 'FD',
    length_ft: 48,
    weight_lbs: 45000,
    full_partial: 'Full',
    pickup_earliest: new Date('2024-02-01').toISOString(),
    pickup_latest: new Date('2024-02-03').toISOString(),
    commodity: 'Steel',
    comment: 'Test lane for debugging'
  };

  try {
    console.log('📊 Lane data:', {
      route: `${mockLane.origin_city}, ${mockLane.origin_state} → ${mockLane.dest_city}, ${mockLane.dest_state}`,
      equipment: mockLane.equipment_code,
      weight: mockLane.weight_lbs
    });
    
    console.log('\n🎯 Testing with fill=true (should generate 156 rows)...\n');
    
    const result = await generateDatCsv([mockLane], true);
    
    if (result.error) {
      console.error('❌ ERROR:', result.error);
      return;
    }
    
    const lines = result.csvData.split('\n').filter(l => l.trim());
    const dataRows = lines.length - 1; // subtract header
    
    console.log('\n📈 RESULTS:');
    console.log(`   Total lines: ${lines.length}`);
    console.log(`   Header: 1 line`);
    console.log(`   Data rows: ${dataRows}`);
    console.log(`   Expected: 156 data rows`);
    console.log(`   Status: ${dataRows === 156 ? '✅ CORRECT' : '❌ INCORRECT'}`);
    
    if (dataRows !== 156) {
      console.log('\n🔍 First few data rows for analysis:');
      lines.slice(1, 6).forEach((line, i) => {
        const cols = line.split(',');
        console.log(`   Row ${i+1}: ${cols[15]}, ${cols[16]} → ${cols[18]}, ${cols[19]}`);
      });
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Chunks: ${result.chunks?.length || 1}`);
    console.log(`   Row count issue: ${dataRows !== 156 ? 'CONFIRMED' : 'RESOLVED'}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testCsvExport();
