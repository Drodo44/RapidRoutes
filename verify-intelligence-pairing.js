import fetch from 'node-fetch';

async function testIntelligencePairingAPI() {
  console.log('🔄 Testing intelligence-pairing API directly...');
  
  const payload = {
    lane_id: '61f287f5-278a-4277-b3fe-9055aad1fec8',
    origin_city: 'Riegelwood',
    origin_state: 'NC',
    origin_zip: '28456',
    destination_city: 'Massillon', 
    destination_state: 'OH',
    destination_zip: '44646',
    equipment_code: 'V',
    test_mode: true,
    mock_auth: true
  };
  
  console.log('📦 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch('https://rapid-routes.vercel.app/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    console.log('📥 Response status:', response.status, response.statusText);
    
    const responseText = await response.text();
    console.log('📝 Raw response:', responseText);
    
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('📋 Parsed JSON response:', JSON.stringify(jsonResponse, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

testIntelligencePairingAPI();
