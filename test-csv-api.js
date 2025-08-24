#!/usr/bin/env node

import fetch from 'node-fetch';

async function testCsvRowCount() {
  console.log('🧪 Testing CSV Row Count Issue...\n');
  
  try {
    // Test with actual API call 
    const response = await fetch('http://localhost:3000/api/simple-test');
    if (!response.ok) {
      console.error('❌ Server not ready:', response.status);
      return;
    }
    console.log('✅ Server is ready\n');
    
    // Test lanes endpoint to get real data
    const lanesResponse = await fetch('http://localhost:3000/api/lanes');
    const lanes = await lanesResponse.json();
    
    if (!Array.isArray(lanes) || lanes.length === 0) {
      console.log('⚠️ No lanes found in database');
      return;
    }
    
    console.log(`📊 Found ${lanes.length} lanes in database`);
    console.log(`   First lane: ${lanes[0].origin_city}, ${lanes[0].origin_state} → ${lanes[0].dest_city}, ${lanes[0].dest_state}`);
    
    // Test CSV export with fill=1
    console.log('\n🎯 Testing CSV export with fill=1...');
    const csvResponse = await fetch('http://localhost:3000/api/exportDatCsv?fill=1&all=1', {
      method: 'GET'
    });
    
    if (!csvResponse.ok) {
      console.error('❌ CSV export failed:', csvResponse.status);
      return;
    }
    
    const csvData = await csvResponse.text();
    const lines = csvData.split('\n').filter(l => l.trim());
    const dataRows = lines.length - 1; // subtract header
    
    console.log('\n📈 CSV Export Results:');
    console.log(`   Total lines: ${lines.length}`);
    console.log(`   Header: 1 line`);
    console.log(`   Data rows: ${dataRows}`);
    console.log(`   Expected per lane: 12 rows (6 postings × 2 contacts)`);
    console.log(`   Total expected: ${lanes.length * 12} rows`);
    console.log(`   Actual vs Expected: ${dataRows} vs ${lanes.length * 12}`);
    console.log(`   Status: ${dataRows === lanes.length * 12 ? '✅ CORRECT' : '❌ INCORRECT'}`);
    
    // Debug headers
    console.log('\n🔍 Debug Headers:');
    for (const [key, value] of csvResponse.headers.entries()) {
      if (key.startsWith('x-debug')) {
        console.log(`   ${key}: ${value}`);
      }
    }
    
    if (dataRows !== lanes.length * 12) {
      console.log('\n❌ Row count mismatch detected!');
      console.log(`   Per lane breakdown:`);
      console.log(`     Expected: 1 base + 5 pairs = 6 postings`);
      console.log(`     Each posting: Email + Phone = 2 rows`);
      console.log(`     Total per lane: 6 × 2 = 12 rows`);
      console.log(`   Actual per lane: ${Math.round(dataRows / lanes.length)} rows`);
      
      // Show first few rows for analysis
      console.log('\n🔍 First few data rows:');
      lines.slice(1, 6).forEach((line, i) => {
        const cols = line.split(',');
        console.log(`   Row ${i+1}: ${cols[14]} | ${cols[15]}, ${cols[16]} → ${cols[18]}, ${cols[19]}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCsvRowCount();
