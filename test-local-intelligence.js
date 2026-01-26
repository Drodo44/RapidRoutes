import http from 'http';

async function testLocalIntelligenceAPI() {
  console.log('🔄 Testing local intelligence-pairing API...');
  
  const payload = {
    lane_id: '61f287f5-278a-4277-b3fe-9055aad1fec8',
    origin_city: 'Cincinnati',
    origin_state: 'OH',
    destination_city: 'Chicago',
    destination_state: 'IL',
    equipment_code: 'V',
    test_mode: true,
    mock_auth: true
  };
  
  console.log('📦 Payload:', JSON.stringify(payload, null, 2));
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/intelligence-pairing',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log('📥 Response status:', res.statusCode, res.statusMessage);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          console.log('📋 Parsed JSON response:', JSON.stringify(responseData, null, 2));
          resolve(responseData);
        } catch (error) {
          console.error('❌ Failed to parse JSON response:', error);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request error:', error);
      reject(error);
    });
    
    req.write(JSON.stringify(payload));
    req.end();
  });
}

testLocalIntelligenceAPI()
  .then(() => {
    console.log('✅ Test completed');
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
  });
