import fetch from 'node-fetch';

async function checkEnvironmentFlags() {
  console.log('🔍 Testing environment flags in intelligence-pairing API...');
  
  const payload = {
    lane_id: 'env-debug-test',
    origin_city: 'Cincinnati',
    origin_state: 'OH',
    destination_city: 'Chicago',
    destination_state: 'IL',
    equipment_code: 'V',
    test_mode: true,
    mock_auth: true,
    debug_env: true  // Add a flag to request env debug info
  };
  
  console.log('📦 Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch('https://rapid-routes.vercel.app/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Env': 'true'  // Add header to indicate we want env debug info
      },
      body: JSON.stringify(payload),
    });
    
    console.log('📥 Response status:', response.status, response.statusText);
    
    const responseText = await response.text();
    try {
      const jsonResponse = JSON.parse(responseText);
      console.log('📋 Response:', JSON.stringify(jsonResponse, null, 2));
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      console.log('Raw response:', responseText.substring(0, 500));
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

checkEnvironmentFlags();
