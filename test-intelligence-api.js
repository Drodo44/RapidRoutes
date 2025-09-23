import http from 'http';

async function testIntelligencePairingAPI() {
  console.log('Testing intelligence-pairing API locally...');
  
  const testData = {
    lane_id: '61f287f5-278a-4277-b3fe-9055aad1fec8',
    origin_city: 'Riegelwood',
    origin_state: 'NC',
    destination_city: 'Massillon', 
    destination_state: 'OH',
    equipment_code: 'V',
    test_mode: true
  };

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
      console.log('Response status:', res.statusCode);
      
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          console.log('Response data:', JSON.stringify(responseData, null, 2));
          resolve(responseData);
        } catch (error) {
          console.error('Error parsing response:', error);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    req.write(JSON.stringify(testData));
    req.end();
  });
}

testIntelligencePairingAPI()
  .then(() => {
    console.log('Handler completed');
  })
  .catch((error) => {
    console.error('Test failed:', error);
  });
