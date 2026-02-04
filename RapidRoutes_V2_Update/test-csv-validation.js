// test-csv-validation.js  
// Test the CSV corruption fixes with real API endpoints

console.log('🚨 TESTING CSV CORRUPTION FIXES');
console.log('===============================');

async function testCsvEndpoints() {
  const baseUrl = 'http://localhost:3000';
  
  // Test 1: Bulk export with no valid lanes (should return JSON error, not corrupted CSV)
  console.log('\n📋 Test 1: Bulk export with empty data...');
  try {
    const response = await fetch(`${baseUrl}/api/exportDatCsv?pending=1`, {
      method: 'GET',
      headers: { 'Accept': 'text/csv' }
    });
    
    console.log('Response status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    
    const content = await response.text();
    console.log('Content length:', content.length);
    console.log('Content preview:', content.substring(0, 200));
    
    if (content.startsWith('{') || content.startsWith('[')) {
      if (response.status >= 400) {
        console.log('✅ GOOD: Returns JSON error with error status (no corruption)');
      } else {
        console.log('❌ BAD: Returns JSON with success status (potential corruption)');
      }
    } else if (content.includes('Pickup Earliest*')) {
      console.log('✅ GOOD: Returns valid CSV with DAT headers');
    } else {
      console.log('❌ UNKNOWN: Unexpected content format');
    }
    
  } catch (error) {
    console.log('❌ Test 1 failed:', error.message);
  }
  
  // Test 2: Single lane export (need to find a valid lane ID first)
  console.log('\n📋 Test 2: Checking if any lanes exist for single export test...');
  try {
    // This would need authentication in real scenario
    console.log('⚠️  Single lane test requires authentication - skipping for now');
  } catch (error) {
    console.log('❌ Test 2 setup failed:', error.message);
  }
  
  // Test 3: Verify DAT headers are exactly 24 fields
  console.log('\n📋 Test 3: Verify DAT headers specification...');
  
  const expectedHeaders = [
    "Pickup Earliest*", "Pickup Latest", "Length (ft)*", "Weight (lbs)*", 
    "Full/Partial*", "Equipment*", "Use Private Network*", "Private Network Rate",
    "Allow Private Network Booking", "Allow Private Network Bidding", 
    "Use DAT Loadboard*", "DAT Loadboard Rate", "Allow DAT Loadboard Booking", 
    "Use Extended Network", "Contact Method*", "Origin City*", "Origin State*", 
    "Origin Postal Code", "Destination City*", "Destination State*", 
    "Destination Postal Code", "Comment", "Commodity", "Reference ID"
  ];
  
  console.log('Expected DAT headers count:', expectedHeaders.length);
  if (expectedHeaders.length === 24) {
    console.log('✅ GOOD: DAT headers specification has exactly 24 fields');
  } else {
    console.log('❌ BAD: DAT headers specification has', expectedHeaders.length, 'fields, should be 24');
  }
}

// Only run if we can detect localhost server is running
if (typeof fetch !== 'undefined') {
  testCsvEndpoints().catch(console.error);
} else {
  console.log('⚠️  Fetch not available - install node-fetch or run in browser');
  console.log('Manual test: Check /api/exportDatCsv endpoint behavior');
}