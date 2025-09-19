// test-lane-generation-final.mjs
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test cases
const testLanes = [
  {
    id: 'test-001',
    origin_city: 'Cincinnati',
    origin_state: 'OH',
    origin_zip: '45202',
    dest_city: 'Chicago',
    dest_state: 'IL',
    dest_zip: '60601',
    equipment_code: 'V',
    length_ft: 53,
    weight_lbs: 45000,
    randomize_weight: false,
    full_partial: 'full',
    pickup_earliest: '2025-09-20',
    pickup_latest: '2025-09-21',
    status: 'pending',
    comment: 'High density corridor test',
    commodity: 'General Freight'
  },
  {
    id: 'test-002',
    origin_city: 'Atlanta',
    origin_state: 'GA',
    origin_zip: '30303',
    dest_city: 'Miami',
    dest_state: 'FL',
    dest_zip: '33101',
    equipment_code: 'R',
    length_ft: 53,
    weight_lbs: 42000,
    randomize_weight: false,
    full_partial: 'full',
    pickup_earliest: '2025-09-20',
    pickup_latest: '2025-09-21',
    status: 'pending',
    comment: 'Southeast corridor test',
    commodity: 'Refrigerated Goods'
  }
];

async function testLaneGeneration() {
  console.log('🔬 LANE GENERATION TEST');
  console.log('=====================\n');

  try {
    const { generateDatCsvRows } = await import('./lib/datCsvBuilder.js');
    
    for (const [index, testLane] of testLanes.entries()) {
      console.log(`Testing Lane ${index + 1}: ${testLane.origin_city} → ${testLane.dest_city}`);
      console.log('----------------------------------------');

      const rows = await generateDatCsvRows(testLane);
      
      if (!rows || !Array.isArray(rows)) {
        throw new Error('No rows generated');
      }

      // Analyze results
      const uniqueOrigins = new Set(rows.map(r => `${r['Origin City*']}, ${r['Origin State*']}`));
      const uniqueDests = new Set(rows.map(r => `${r['Destination City*']}, ${r['Destination State*']}`));
      const contactMethods = new Set(rows.map(r => r['Contact Method*']));
      const kmas = new Set();
      
      rows.forEach(row => {
        // Extract KMA codes if available
        if (row.kma_code) kmas.add(row.kma_code);
      });

      console.log('\nGeneration Results:');
      console.log(`Total Rows: ${rows.length}`);
      console.log(`Unique Origins: ${uniqueOrigins.size}`);
      console.log(`Unique Destinations: ${uniqueDests.size}`);
      console.log(`Contact Methods: ${Array.from(contactMethods).join(', ')}`);
      console.log(`Unique KMAs: ${kmas.size}`);

      // Requirements validation
      const meetsMinimumPairs = uniqueOrigins.size >= 6;
      const hasAllContactMethods = contactMethods.has('Email') && contactMethods.has('Primary Phone');
      const rowCountValid = rows.length >= uniqueOrigins.size * 2; // At least 2 contact methods per pair

      console.log('\nRequirements Check:');
      console.log(`${meetsMinimumPairs ? '✅' : '❌'} Minimum 6 origin pairs: ${uniqueOrigins.size}`);
      console.log(`${hasAllContactMethods ? '✅' : '❌'} Contact methods duplication`);
      console.log(`${rowCountValid ? '✅' : '❌'} Row count meets minimum requirement`);

      // Sample output
      console.log('\nSample Rows:');
      rows.slice(0, 3).forEach((row, i) => {
        console.log(`\nRow ${i + 1}:`);
        console.log(`Origin: ${row['Origin City*']}, ${row['Origin State*']} (${row['Origin Postal Code'] || 'No ZIP'})`);
        console.log(`Destination: ${row['Destination City*']}, ${row['Destination State*']} (${row['Destination Postal Code'] || 'No ZIP'})`);
        console.log(`Contact Method: ${row['Contact Method*']}`);
        console.log(`Equipment: ${row['Equipment*']}`);
        console.log(`Weight: ${row['Weight (lbs)*']} lbs`);
      });

      console.log('\n');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testLaneGeneration().catch(console.error);