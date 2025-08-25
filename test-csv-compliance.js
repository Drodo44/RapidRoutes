// test-csv-compliance.js
// Test CSV generation for DAT compliance

import { DAT_HEADERS } from './lib/datHeaders.js';

// Mock baseRowFrom function to test
function mockBaseRowFrom(lane, origin, dest, contact) {
  const pickupLatest = lane.pickup_latest || lane.pickup_earliest;
  
  // Generate reference ID in RR12345 format (RR + 5 digits ONLY, no letters)
  let referenceId = lane.reference_id;
  if (!referenceId || !/^RR\d{5}$/.test(referenceId)) {
    // Fallback: generate pure numeric reference ID from lane ID
    const laneId = parseInt(lane.id, 10);
    if (isNaN(laneId)) {
      // Emergency fallback if lane.id is somehow not a number
      referenceId = `RR${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;
    } else {
      const numericId = String(Math.abs(laneId) % 100000).padStart(5, '0');
      referenceId = `RR${numericId}`;
    }
  }
  
  return {
    'Pickup Earliest*': lane.pickup_earliest,
    'Pickup Latest': pickupLatest,
    'Length (ft)*': String(Number(lane.length_ft)),
    'Weight (lbs)*': String(Number(lane.weight_lbs)),
    'Full/Partial*': lane.full_partial || 'full',
    'Equipment*': String(lane.equipment_code).toUpperCase(),
    'Use Private Network*': 'yes',
    'Private Network Rate': '', // COMPLETELY BLANK
    'Allow Private Network Booking': 'no',
    'Allow Private Network Bidding': 'no',
    'Use DAT Loadboard*': 'yes',
    'DAT Loadboard Rate': '', // COMPLETELY BLANK
    'Allow DAT Loadboard Booking': 'no',
    'Use Extended Network': 'yes',
    'Contact Method*': contact,
    'Origin City*': origin.city,
    'Origin State*': origin.state,
    'Origin Postal Code': origin.zip || '',
    'Destination City*': dest.city,
    'Destination State*': dest.state,
    'Destination Postal Code': dest.zip || '',
    'Comment': lane.comment || '',
    'Commodity': lane.commodity || '',
    'Reference ID': referenceId.slice(0, 8)
  };
}

console.log('🧪 Testing CSV Compliance...\n');

// Test various lane ID scenarios
const testLanes = [
  { id: 123, pickup_earliest: '08/25/2025', length_ft: 48, weight_lbs: 45000, equipment_code: 'FD', full_partial: 'full' },
  { id: 'abc123', pickup_earliest: '08/25/2025', length_ft: 48, weight_lbs: 45000, equipment_code: 'FD', full_partial: 'full' },
  { id: null, pickup_earliest: '08/25/2025', length_ft: 48, weight_lbs: 45000, equipment_code: 'FD', full_partial: 'full' },
  { id: 999999, pickup_earliest: '08/25/2025', length_ft: 48, weight_lbs: 45000, equipment_code: 'FD', full_partial: 'full' }
];

const origin = { city: 'Chicago', state: 'IL' };
const dest = { city: 'Los Angeles', state: 'CA' };

testLanes.forEach((lane, i) => {
  console.log(`Test ${i + 1}: Lane ID = ${lane.id}`);
  const row = mockBaseRowFrom(lane, origin, dest, 'email');
  
  console.log(`  Reference ID: ${row['Reference ID']}`);
  console.log(`  Private Network Rate: "${row['Private Network Rate']}" (length: ${row['Private Network Rate'].length})`);
  console.log(`  DAT Loadboard Rate: "${row['DAT Loadboard Rate']}" (length: ${row['DAT Loadboard Rate'].length})`);
  console.log(`  Use Extended Network: ${row['Use Extended Network']}`);
  
  // Validate reference ID format
  const isValidRef = /^RR\d{5}$/.test(row['Reference ID']);
  console.log(`  Valid ref format: ${isValidRef ? '✅' : '❌'}`);
  
  // Validate empty rate fields
  const emptyRates = row['Private Network Rate'] === '' && row['DAT Loadboard Rate'] === '';
  console.log(`  Empty rate fields: ${emptyRates ? '✅' : '❌'}\n`);
});

console.log('✅ Test completed!');
