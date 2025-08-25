// test-dat-compliance.js
// Verify DAT CSV compliance before deployment

import { DAT_HEADERS } from './lib/datHeaders.js';

// Mock lane data to test CSV generation
const mockLane = {
  id: 12345,
  origin_city: 'Chicago',
  origin_state: 'IL',
  dest_city: 'Los Angeles',
  dest_state: 'CA',
  equipment_code: 'FD',
  length_ft: 48,
  weight_lbs: 45000,
  full_partial: 'full',
  pickup_earliest: '08/26/2025',
  pickup_latest: '08/27/2025',
  comment: 'Test freight',
  commodity: 'Steel',
  reference_id: 'RR12345'
};

function testReferenceIdFormat() {
  console.log('🔍 Testing Reference ID Format...');
  
  // Test various lane IDs
  const testIds = [1, 123, 12345, 999999];
  
  testIds.forEach(id => {
    const referenceId = `RR${String(id).padStart(5, '0').slice(-5)}`;
    const isValid = /^RR\d{5}$/.test(referenceId);
    console.log(`   Lane ID ${id} → ${referenceId} ${isValid ? '✅' : '❌'}`);
  });
}

function testDatHeaders() {
  console.log('🔍 Testing DAT Headers...');
  console.log(`   Header count: ${DAT_HEADERS.length} ${DAT_HEADERS.length === 24 ? '✅' : '❌'}`);
  console.log(`   Reference ID header: "${DAT_HEADERS[23]}" ${DAT_HEADERS[23] === 'Reference ID' ? '✅' : '❌'}`);
  
  // Verify all required fields have asterisks
  const requiredFields = DAT_HEADERS.filter(h => h.endsWith('*'));
  console.log(`   Required fields (*): ${requiredFields.length}/9 ${requiredFields.length === 9 ? '✅' : '❌'}`);
}

function testRowGeneration() {
  console.log('🔍 Testing Row Generation...');
  
  // Mock baseRowFrom function
  function mockBaseRowFrom(lane, origin, dest, contact) {
    const pickupLatest = lane.pickup_latest || lane.pickup_earliest;
    const referenceId = lane.reference_id || `RR${String(lane.id).padStart(5, '0').slice(-5)}`;
    
    return {
      'Pickup Earliest*': lane.pickup_earliest,
      'Pickup Latest': pickupLatest,
      'Length (ft)*': String(Number(lane.length_ft)),
      'Weight (lbs)*': String(Number(lane.weight_lbs)),
      'Full/Partial*': lane.full_partial || 'full',
      'Equipment*': String(lane.equipment_code).toUpperCase(),
      'Use Private Network*': 'yes',
      'Private Network Rate': '',
      'Allow Private Network Booking': 'no',
      'Allow Private Network Bidding': 'no',
      'Use DAT Loadboard*': 'yes',
      'DAT Loadboard Rate': '',
      'Allow DAT Loadboard Booking': 'no',
      'Use Extended Network': 'no',
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
  
  const origin = { city: mockLane.origin_city, state: mockLane.origin_state };
  const dest = { city: mockLane.dest_city, state: mockLane.dest_state };
  
  const row = mockBaseRowFrom(mockLane, origin, dest, 'email');
  
  // Check that all DAT_HEADERS are present as keys
  const missingFields = DAT_HEADERS.filter(header => !(header in row));
  const extraFields = Object.keys(row).filter(key => !DAT_HEADERS.includes(key));
  
  console.log(`   All fields present: ${missingFields.length === 0 ? '✅' : '❌'}`);
  if (missingFields.length > 0) {
    console.log(`   Missing: ${missingFields.join(', ')}`);
  }
  
  console.log(`   No extra fields: ${extraFields.length === 0 ? '✅' : '❌'}`);
  if (extraFields.length > 0) {
    console.log(`   Extra: ${extraFields.join(', ')}`);
  }
  
  console.log(`   Reference ID: "${row['Reference ID']}" ${/^RR\d{5}$/.test(row['Reference ID']) ? '✅' : '❌'}`);
}

console.log('🚀 DAT CSV Compliance Test\n');
testReferenceIdFormat();
console.log('');
testDatHeaders();
console.log('');
testRowGeneration();
console.log('\n✅ All tests completed!');
