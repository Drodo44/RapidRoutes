// test-csv-simple.js
// Test just the toCsv function with mock data

import { toCsv, DAT_HEADERS } from './lib/datCsvBuilder.js';

console.log('🚨 TESTING CSV FUNCTION DIRECTLY');
console.log('=================================');

// Test with valid row data
const validRows = [
  {
    'Pickup Earliest*': '2025-09-15',
    'Pickup Latest': '2025-09-17', 
    'Length (ft)*': '48',
    'Weight (lbs)*': '45000',
    'Full/Partial*': 'F',
    'Equipment*': 'FD',
    'Use Private Network*': 'Yes',
    'Private Network Rate': '',
    'Allow Private Network Booking': 'Yes',
    'Allow Private Network Bidding': 'No',
    'Use DAT Loadboard*': 'Yes',
    'DAT Loadboard Rate': '', 
    'Allow DAT Loadboard Booking': 'Yes',
    'Use Extended Network': 'No',
    'Contact Method*': 'Email',
    'Origin City*': 'Cincinnati',
    'Origin State*': 'OH',
    'Origin Postal Code': '45202',
    'Destination City*': 'Philadelphia',
    'Destination State*': 'PA', 
    'Destination Postal Code': '19102',
    'Comment': 'Test freight',
    'Commodity': 'General',
    'Reference ID': 'RR123456'
  }
];

console.log('📋 Testing with valid row data...');
try {
  const csv = toCsv(DAT_HEADERS, validRows);
  console.log('✅ Success with valid data');
  console.log('CSV length:', csv.length);
  console.log('First 200 chars:', csv.substring(0, 200));
} catch (error) {
  console.log('❌ Error with valid data:', error.message);
}

console.log('');
console.log('📋 Testing with error object (simulating corruption)...');
const errorObject = {
  message: 'Failed to generate pairs',
  error: 'Database connection failed', 
  details: { lane_id: 'test-123' }
};

try {
  const csv = toCsv(DAT_HEADERS, errorObject);
  console.log('😱 ERROR: toCsv accepted error object!');
  console.log('CSV result:', csv);
} catch (error) {
  console.log('✅ Good: toCsv properly rejected error object');
  console.log('Error:', error.message);
}

console.log('');
console.log('📋 Testing with JSON string (simulating serialized error)...');
const jsonString = JSON.stringify(errorObject);

try {
  const csv = toCsv(DAT_HEADERS, jsonString);
  console.log('😱 ERROR: toCsv accepted JSON string!');
  console.log('CSV result:', csv);
} catch (error) {
  console.log('✅ Good: toCsv properly rejected JSON string');
  console.log('Error:', error.message);
}