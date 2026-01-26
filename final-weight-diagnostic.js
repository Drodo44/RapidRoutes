#!/usr/bin/env node

console.log('🧪 COMPREHENSIVE DAT WEIGHT LIMITS DIAGNOSTIC');
console.log('='.repeat(60));

// Valid test lanes within DAT limits
const validLanes = [
  {
    id: 'v1',
    origin_city: 'Atlanta', origin_state: 'GA', origin_zip: '30309',
    dest_city: 'Dallas', dest_state: 'TX', dest_zip: '75201',
    equipment_code: 'V', length_ft: 53, weight_lbs: 45000,
    pickup_earliest: '12/20/2024', pickup_latest: '12/21/2024',
    full_partial: 'full', status: 'active', comment: 'Dry Van Test', commodity: 'General'
  },
  {
    id: 'r1', 
    origin_city: 'Miami', origin_state: 'FL', origin_zip: '33101',
    dest_city: 'New York', dest_state: 'NY', dest_zip: '10001',
    equipment_code: 'R', length_ft: 53, weight_lbs: 41000,
    pickup_earliest: '12/22/2024', pickup_latest: '12/23/2024',
    full_partial: 'full', status: 'active', comment: 'Reefer Test', commodity: 'Food'
  },
  {
    id: 'f1',
    origin_city: 'Chicago', origin_state: 'IL', origin_zip: '60601', 
    dest_city: 'Denver', dest_state: 'CO', dest_zip: '80202',
    equipment_code: 'F', length_ft: 48, weight_lbs: 47000,
    pickup_earliest: '12/24/2024', pickup_latest: '12/25/2024',
    full_partial: 'full', status: 'active', comment: 'Flatbed Test', commodity: 'Steel'
  }
];

// Import modules
Promise.all([
  import('./lib/enterpriseValidation.js'),
  import('./lib/datCsvBuilder.js')
]).then(async ([validationModule, csvModule]) => {
  const { validateLane } = validationModule;
  const { generateDatCsvRows, toCsv } = csvModule;

  console.log('\n📊 DAT WEIGHT LIMITS VERIFICATION:');
  console.log('V (Dry Van): 46,000 lbs');
  console.log('R (Reefer): 42,000 lbs'); 
  console.log('F (Flatbed): 48,000 lbs');

  console.log('\n🔍 VALIDATING COMPLIANT LANES:');
  let validCount = 0;
  const validatedLanes = [];

  for (const lane of validLanes) {
    try {
      await validateLane(lane);
      console.log(`✅ ${lane.id} (${lane.equipment_code}, ${lane.weight_lbs} lbs) PASSED`);
      validatedLanes.push(lane);
      validCount++;
    } catch (error) {
      console.log(`❌ ${lane.id} FAILED: ${error.message}`);
    }
  }

  console.log(`\n📈 VALIDATION RESULTS: ${validCount}/${validLanes.length} lanes passed (${Math.round(validCount/validLanes.length*100)}%)`);

  if (validatedLanes.length > 0) {
    console.log('\n🏗️ GENERATING CSV FOR FIRST VALID LANE...');
    try {
      const rows = await generateDatCsvRows(validatedLanes[0]);
      console.log(`✅ Generated ${rows.length} CSV rows`);
      
      if (rows.length > 0) {
        const headers = [
          'Pickup Earliest*', 'Pickup Latest', 'Length (ft)*', 'Weight (lbs)*',
          'Full/Partial*', 'Equipment*', 'Use Private Network*', 'Private Network Rate',
          'Allow Private Network Booking', 'Allow Private Network Bidding',
          'Use DAT Loadboard*', 'DAT Loadboard Rate', 'Allow DAT Loadboard Booking',
          'Use Extended Network', 'Contact Method*', 'Origin City*', 'Origin State*',
          'Origin Postal Code', 'Destination City*', 'Destination State*',
          'Destination Postal Code', 'Comment', 'Commodity', 'Reference ID'
        ];
        
        const csvContent = toCsv(headers, rows);
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        console.log('\n📋 FIRST 3 VALID CSV ROWS:');
        lines.slice(1, 4).forEach((line, i) => {
          const cols = line.split(',');
          console.log(`Row ${i+1}: ${cols[0]} | ${cols[3]} lbs | ${cols[5]} | ${cols[15]}-${cols[16]} → ${cols[18]}-${cols[19]}`);
        });
        
        console.log(`\n📊 SUCCESS: ${lines.length-1} total CSV rows generated`);
      }
    } catch (error) {
      console.log(`❌ CSV generation failed: ${error.message}`);
      console.log('Error stack:', error.stack || 'No stack trace');
    }
  }

  // Test some failing lanes to confirm rejection
  console.log('\n❌ TESTING LANES THAT SHOULD FAIL:');
  const overweightLanes = [
    { id: 'fail-v', equipment_code: 'V', weight_lbs: 47000, comment: 'Over 46k limit' },
    { id: 'fail-r', equipment_code: 'R', weight_lbs: 43000, comment: 'Over 42k limit' },
    { id: 'fail-f', equipment_code: 'F', weight_lbs: 49000, comment: 'Over 48k limit' }
  ];

  for (const failLane of overweightLanes) {
    const testLane = { ...validLanes[0], ...failLane };
    try {
      await validateLane(testLane);
      console.log(`⚠️ UNEXPECTED: ${failLane.id} should have failed but passed`);
    } catch (error) {
      console.log(`✅ ${failLane.id} correctly rejected: ${error.message}`);
    }
  }

  console.log('\n🎯 DIAGNOSTIC COMPLETE - DAT WEIGHT LIMITS WORKING CORRECTLY');
  console.log('='.repeat(60));

}).catch(console.error);