#!/usr/bin/env node

/**
 * DIRECT API TEST: Call the actual export API with minimal lane data
 */

const { exec } = require('child_process');
const https = require('https');

// Test data - mimicking a simple lane
const testLane = {
  id: 999,
  origin_city: 'Belvidere',
  origin_state: 'IL', 
  dest_city: 'Schofield',
  dest_state: 'WI',
  equipment_code: 'FD',
  weight_lbs: 47000,
  length_ft: 48,
  full_partial: 'full',
  pickup_earliest: '2025-08-28',
  pickup_latest: '2025-08-29',
  status: 'active',
  comment: '',
  commodity: '',
  reference_id: 'RR99999'
};

async function testDirectAPI() {
  console.log('🧪 DIRECT API TEST: Testing single lane export');
  console.log('');

  // Call the local Next.js server directly
  const testURL = 'http://localhost:3000/api/exportDatCsv?pending=0&fill=1&testMode=1';
  
  console.log(`📡 Calling: ${testURL}`);
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = https.request(testURL, options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`📊 Response Status: ${res.statusCode}`);
      console.log(`📊 Response Headers:`, res.headers);
      console.log('📊 Response Data:');
      console.log(data.substring(0, 1000)); // First 1000 chars
      
      // Count lines 
      const lines = data.split('\n').filter(line => line.trim());
      console.log(`📊 Total CSV lines: ${lines.length}`);
      console.log(`📊 Expected lines: 12 (6 postings × 2 contacts) with fill=1`);
    });
  });

  req.on('error', (err) => {
    console.error('❌ Request failed:', err);
  });

  req.write(JSON.stringify({ lanes: [testLane] }));
  req.end();
}

testDirectAPI();
