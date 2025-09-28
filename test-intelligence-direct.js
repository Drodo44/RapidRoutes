// test-intelligence-direct.js
// Tests intelligence-pairing API by directly importing the module

import apiHandler from './pages/api/intelligence-pairing.js';

async function testIntelligencePairingAPI() {
  // API handler already imported at the top
  
  // Create mock request and response objects
  const req = {
    method: 'POST',
    body: {
      lane: {
        origin_city: 'Atlanta',
        origin_state: 'GA',
        origin_zip: '30303',
        dest_city: 'Chicago', 
        dest_state: 'IL',
        dest_zip: '60601',
        equipment_code: 'FD',
        weight_lbs: 42000,
        length_ft: 48
      }
    },
    query: {
      test_mode: 'true'
    },
    headers: {}
  };
  
  const res = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.data = data;
      return this;
    },
    statusCode: 200,
    data: null
  };
  
  console.log('Testing intelligence-pairing API directly...');
  console.log('Request:', JSON.stringify(req.body, null, 2));
  
  try {
    // Call the API handler
    await apiHandler(req, res);
    
    // Output the response
    console.log('\nResponse:');
    console.log('Status:', res.statusCode);
    console.log('Success:', res.data.success);
    console.log('Message:', res.data.message);
    
    if (res.data.pairs && res.data.pairs.length > 0) {
      const pairs = res.data.pairs;
      console.log(`\nGenerated ${pairs.length} pairs`);
      
      // Show first 3 pairs
      for (let i = 0; i < Math.min(3, pairs.length); i++) {
        const pair = pairs[i];
        console.log(`\nPair ${i+1}:`);
        console.log(`  Origin: ${pair.origin.city}, ${pair.origin.state}`);
        console.log(`  Destination: ${pair.destination.city}, ${pair.destination.state}`);
      }
      
      // Check KMAs
      const originKmas = new Set(pairs.filter(p => p.origin.kma_code).map(p => p.origin.kma_code));
      const destKmas = new Set(pairs.filter(p => p.destination.kma_code).map(p => p.destination.kma_code));
      
      console.log(`\nUnique Origin KMAs: ${originKmas.size}`);
      console.log(`Unique Destination KMAs: ${destKmas.size}`);
      
      if (originKmas.size < 6 || destKmas.size < 6) {
        console.warn('⚠️ Warning: Less than 6 unique KMAs found. This may cause issues with DAT CSV generation.');
      } else {
        console.log('✅ KMA requirement satisfied: At least 6 unique KMAs for both origin and destination');
      }
    } else {
      console.log('\n❌ No city pairs generated');
      if (res.data.error) {
        console.error('Error:', res.data.error);
      }
    }
  } catch (error) {
    console.error('❌ API call failed:', error);
  }
}

// Run the test
testIntelligencePairingAPI();