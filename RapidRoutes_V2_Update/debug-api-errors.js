import fetch from 'node-fetch';

// Test data likely to trigger useful error messages
const testCases = [
  {
    name: "Basic city pair",
    payload: {
      lane_id: 'debug-test',
      origin_city: 'Cincinnati',
      origin_state: 'OH',
      destination_city: 'Chicago',
      destination_state: 'IL',
      equipment_code: 'V',
      test_mode: true,
      mock_auth: true
    }
  },
  {
    name: "Small city pair",
    payload: {
      lane_id: 'debug-test-small',
      origin_city: 'Riegelwood',
      origin_state: 'NC',
      destination_city: 'Massillon',
      destination_state: 'OH',
      equipment_code: 'V',
      test_mode: true,
      mock_auth: true
    }
  }
];

async function testApiEndpoint(testCase) {
  console.log(`\n🔍 Testing: ${testCase.name}`);
  console.log('📦 Payload:', JSON.stringify(testCase.payload, null, 2));
  
  try {
    const response = await fetch('https://rapid-routes.vercel.app/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.payload),
    });
    
    console.log('📥 Response status:', response.status, response.statusText);
    
    const responseText = await response.text();
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('📋 Response:', JSON.stringify(jsonResponse, null, 2));
      
      // Detailed error analysis
      if (!jsonResponse.success) {
        console.log('⚠️ ERROR DETAILS:');
        if (jsonResponse.error === 'Origin city not found in KMA lookup') {
          console.log(`  - Origin city "${testCase.payload.origin_city}" not found in database`);
        } else if (jsonResponse.error === 'Destination city not found in KMA lookup') {
          console.log(`  - Destination city "${testCase.payload.destination_city}" not found in database`);
        } else if (jsonResponse.error === 'Unauthorized') {
          console.log('  - Authentication error, check if test_mode and mock_auth are correctly implemented');
        } else {
          console.log(`  - ${jsonResponse.error}: ${jsonResponse.details || 'No details provided'}`);
        }
      }
      
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      console.log('Raw response:', responseText.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

// Run all test cases
async function runAllTests() {
  console.log('🧪 Running API Error Detection Tests');
  
  for (const testCase of testCases) {
    await testApiEndpoint(testCase);
  }
}

runAllTests();
