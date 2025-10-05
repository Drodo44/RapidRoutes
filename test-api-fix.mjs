import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function testApiEndpoint() {
  console.log('Testing /api/lanes endpoint with lane_status filters...\n');
  
  const tests = [
    { url: '/api/lanes?lane_status=posted', label: 'Posted lanes' },
    { url: '/api/lanes?lane_status=pending', label: 'Pending lanes' },
    { url: '/api/lanes?lane_status=covered', label: 'Covered lanes' },
    { url: '/api/lanes', label: 'All lanes (no filter)' }
  ];
  
  for (const test of tests) {
    console.log(`Testing: ${test.label}`);
    console.log(`URL: ${BASE_URL}${test.url}`);
    
    try {
      const response = await fetch(`${BASE_URL}${test.url}`);
      const status = response.status;
      
      if (status === 200) {
        const data = await response.json();
        console.log(`✅ Status: ${status}`);
        console.log(`   Result: ${Array.isArray(data) ? data.length : 0} lanes`);
      } else {
        const errorText = await response.text();
        console.log(`❌ Status: ${status}`);
        console.log(`   Error: ${errorText.substring(0, 100)}`);
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
    }
    
    console.log('');
  }
}

testApiEndpoint();
