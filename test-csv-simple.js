// Simple test without database dependency - just test CSV generation
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('🚀 TESTING CSV GENERATION WITH PRE-VERIFIED CITIES');
console.log('================================================');

// Mock some pre-verified pairs (simulating HERE.com verified results)
const mockVerifiedPairs = [
  {
    pickup: { city: 'Seaboard', state: 'NC', zip: '27876' },
    delivery: { city: 'Oxford', state: 'PA', zip: '19363' },
    geographic: { pickup_kma: 'NC_RAL', delivery_kma: 'PA_PHI' },
    score: 2.15,
    intelligence: 'freight_optimized'
  },
  {
    pickup: { city: 'Accomac', state: 'VA', zip: '23301' },
    delivery: { city: 'Aberdeen', state: 'MD', zip: '21001' },
    geographic: { pickup_kma: 'VA_NOR', delivery_kma: 'MD_BAL' },
    score: 2.09,
    intelligence: 'freight_optimized'
  }
];

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
  comment: 'Test export with HERE.com verification'
};

async function testCsvGeneration() {
  try {
    // Import after dotenv is loaded
    const { rowsFromBaseAndPairs } = await import('./lib/datCsvBuilder.js');
    
    console.log('\n1. Mock verified pairs loaded:');
    console.log(`📊 Pairs: ${mockVerifiedPairs.length}`);
    mockVerifiedPairs.forEach((pair, i) => {
      console.log(`   ${i+1}. ${pair.pickup.city}, ${pair.pickup.state} → ${pair.delivery.city}, ${pair.delivery.state}`);
    });

    console.log('\n2. Generating CSV rows...');
    const baseOrigin = { city: testLane.origin_city, state: testLane.origin_state, zip: testLane.origin_zip };
    const baseDest = { city: testLane.dest_city, state: testLane.dest_state, zip: testLane.dest_zip };
    
    const csvRows = rowsFromBaseAndPairs(testLane, baseOrigin, baseDest, mockVerifiedPairs);
    
    console.log(`📊 Generated ${csvRows.length} CSV rows`);
    console.log('📊 Raw CSV rows type:', typeof csvRows);
    console.log('📊 Raw CSV rows[0] type:', typeof csvRows[0]);
    console.log('📊 Raw CSV rows[0]:', csvRows[0]);
    console.log(`📊 Expected: ${mockVerifiedPairs.length * 2} rows (2 contact methods per pair)`);

    console.log('\n3. Sample CSV output:');
    const headers = [
      'Pickup Earliest*', 'Pickup Latest', 'Length (ft)*', 'Weight (lbs)*',
      'Full/Partial*', 'Equipment*', 'Use Private Network*', 'Private Network Rate',
      'Allow Private Network Booking', 'Allow Private Network Bidding',
      'Use DAT Loadboard*', 'DAT Loadboard Rate', 'Allow DAT Loadboard Booking',
      'Use Extended Network', 'Contact Method*', 'Origin City*', 'Origin State*',
      'Origin Postal Code', 'Destination City*', 'Destination State*',
      'Destination Postal Code', 'Comment', 'Commodity', 'Reference ID'
    ];

    console.log('\nFirst 2 rows:');
    csvRows.slice(0, 2).forEach((row, i) => {
      console.log(`Row ${i + 1}:`);
      Object.entries(row).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
      console.log('');
    });

    console.log('\n4. Reference ID format check:');
    const referenceId = csvRows[0]['Reference ID']; // Correct object property access
    console.log(`Reference ID: "${referenceId}"`);
    console.log(`✅ Format: ${referenceId.startsWith('RR') ? 'Correct (RR prefix)' : 'INCORRECT'}`);
    console.log(`✅ Clean: ${!referenceId.includes('"') ? 'No Excel quotes' : 'HAS EXCEL QUOTES - WILL CAUSE DAT ERROR'}`);

    console.log('\n✅ CSV GENERATION TEST COMPLETE');
    console.log('🎯 This output should work for drag-and-drop DAT posting!');
    console.log('🛡️ Cities would be pre-verified with HERE.com in production');

  } catch (error) {
    console.error('❌ CSV generation test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCsvGeneration();
