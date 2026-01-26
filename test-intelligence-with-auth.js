import fetch from 'node-fetch';

// Set test mode to true for local testing without auth token
const TEST_MODE = true;

async function testIntelligencePairingAPI() {
  console.log('🔄 Testing intelligence-pairing API directly with test mode enabled...');
  
  const payload = {
    lane_id: '61f287f5-278a-4277-b3fe-9055aad1fec8',
    origin_city: 'Riegelwood',
    origin_state: 'NC',
    origin_zip: '28456',
    destination_city: 'Massillon', 
    destination_state: 'OH',
    destination_zip: '44646',
    equipment_code: 'V',
    test_mode: TEST_MODE,  // Enables test mode for bypassing auth
    mock_auth: true        // Enables mock authentication for local development
  };
  
  console.log('📦 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch('https://rapid-routes.vercel.app/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-token-for-test-mode'  // This will be ignored in test mode
      },
      body: JSON.stringify(payload),
    });
    
    console.log('📥 Response status:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('📝 Raw response:', responseText);
    
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('📋 Parsed JSON response:', JSON.stringify(jsonResponse, null, 2));
      
      // Check for specific error types to help debugging
      if (!jsonResponse.success) {
        if (jsonResponse.error === 'Origin city not found in KMA lookup') {
          console.log('⚠️ KMA lookup failed for origin city. Check if this city exists in the database.');
        } else if (jsonResponse.error === 'Destination city not found in KMA lookup') {
          console.log('⚠️ KMA lookup failed for destination city. Check if this city exists in the database.');
        }
      }
      
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testIntelligencePairingAPI();
