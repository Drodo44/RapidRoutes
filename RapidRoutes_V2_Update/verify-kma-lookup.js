// verify-kma-lookup.js
// A direct test script for the KMA lookup API

// Use native fetch in Node.js
// No need to import

// Test payload from logs
const payload = {
  "lane_id": "61f287f5-278a-4277-b3fe-9055aad1fec8",
  "origin_city": "Riegelwood",
  "origin_state": "NC",
  "destination_city": "Massillon",
  "destination_state": "OH",
  "equipment_code": "V"
};

// Local test function for direct API call
async function testApiDirect() {
  try {
    console.log('🔄 Testing KMA lookup API directly...');
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    // Use mock auth for testing
    const apiUrl = 'https://rapid-routes.vercel.app/api/kma-lookup?mock_auth=true';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log(`📥 Response status: ${response.status} ${response.statusText}`);
    
    // Try to parse the response body
    let responseBody;
    try {
      responseBody = await response.text();
      console.log('📝 Raw response:', responseBody);
      
      try {
        const jsonResponse = JSON.parse(responseBody);
        console.log('📋 Parsed JSON response:', JSON.stringify(jsonResponse, null, 2));
      } catch (jsonError) {
        console.error('❌ Failed to parse response as JSON:', jsonError.message);
      }
    } catch (bodyError) {
      console.error('❌ Failed to read response body:', bodyError);
    }
  } catch (error) {
    console.error('❌ Test failed with an exception:', error);
  }
}

// Run the test
testApiDirect();