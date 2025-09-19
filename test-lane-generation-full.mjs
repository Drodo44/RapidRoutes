// test-lane-generation-full.mjs
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gwuhjxomavulwduhvgvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3dWhqeG9tYXZ1bHdkdWh2Z3ZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTkzOTYyOSwiZXhwIjoyMDY3NTE1NjI5fQ.vYLGwjNHHPhJZPnemRAhlWXAYKrKH--9BOzfe6TWQVQ';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test lane for validation
const testLane = {
  id: 'test-generation-001',
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
  comment: 'Generation test load',
  commodity: 'General Freight'
};

async function testLaneGeneration() {
  try {
    console.log('🔬 LANE GENERATION TEST');
    console.log('=====================');
    
    console.log('\n1. Testing Enterprise CSV Generator initialization...');
    const { EnterpriseCsvGenerator } = await import('./lib/enterpriseCsvGenerator.js');
    
    const generator = new EnterpriseCsvGenerator({
      generation: {
        minPairsPerLane: 6,
        enableTransactions: true,
        enableCaching: true
      },
      verification: { postGenerationVerification: true }
    });

    console.log('\n2. Starting test lane generation...');
    const result = await generator.generate([testLane]);

    // Analyze results
    console.log('\n3. Generation Results:');
    console.log(`   Success: ${result.success ? '✅' : '❌'}`);
    console.log(`   Total Rows: ${result.csv?.rows?.length || 0}`);
    
    if (result.laneResults && result.laneResults.length > 0) {
      const laneResult = result.laneResults[0];
      console.log('\n4. Detailed Analysis:');
      console.log(`   - KMA Coverage: ${laneResult.unique_kmas || 0} unique KMAs`);
      console.log(`   - Pairs Generated: ${laneResult.pairs_generated || 0} pairs`);
      console.log(`   - Rows Generated: ${laneResult.rows_generated || 0} rows`);
      
      if (result.csv?.rows?.length > 0) {
        // Sample the first few rows
        console.log('\n5. Row Sample Analysis:');
        const sampleRows = result.csv.rows.slice(0, 3);
        sampleRows.forEach((row, i) => {
          console.log(`\nRow ${i + 1}:`);
          console.log(`   Origin: ${row['Origin City*']}, ${row['Origin State*']} (${row['Origin Postal Code'] || 'No ZIP'})`);
          console.log(`   Destination: ${row['Destination City*']}, ${row['Destination State*']} (${row['Destination Postal Code'] || 'No ZIP'})`);
          console.log(`   Contact Method: ${row['Contact Method*']}`);
          console.log(`   Equipment: ${row['Equipment*']}`);
          console.log(`   Weight: ${row['Weight (lbs)*']} lbs`);
        });
      }
    }

    console.log('\n6. Requirements Validation:');
    if (result.csv?.rows) {
      const rows = result.csv.rows;
      const uniqueOrigins = new Set(rows.map(r => `${r['Origin City*']}, ${r['Origin State*']}`));
      const uniqueDests = new Set(rows.map(r => `${r['Destination City*']}, ${r['Destination State*']}`));
      const contactMethods = new Set(rows.map(r => r['Contact Method*']));

      console.log(`   ✓ Row Count: ${rows.length} rows total`);
      console.log(`   ✓ Unique Origins: ${uniqueOrigins.size}`);
      console.log(`   ✓ Unique Destinations: ${uniqueDests.size}`);
      console.log(`   ✓ Contact Methods: ${Array.from(contactMethods).join(', ')}`);
      
      // Validation against requirements
      const meetsMinimumPairs = uniqueOrigins.size >= 6;
      const hasAllContactMethods = contactMethods.has('Email') && contactMethods.has('Primary Phone');
      const rowCountMatches = rows.length === uniqueOrigins.size * uniqueDests.size * contactMethods.size;

      console.log('\n7. Requirements Check:');
      console.log(`   ${meetsMinimumPairs ? '✅' : '❌'} Minimum 6 pairs: ${uniqueOrigins.size} unique combinations`);
      console.log(`   ${hasAllContactMethods ? '✅' : '❌'} Contact method duplication: ${contactMethods.size} methods`);
      console.log(`   ${rowCountMatches ? '✅' : '❌'} Row count matches pair/contact combinations`);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testLaneGeneration().catch(console.error);