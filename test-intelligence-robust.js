import fetch from 'node-fetch';

// Common cities known to exist in the database for testing
const TEST_CITIES = [
  { origin_city: 'Cincinnati', origin_state: 'OH', destination_city: 'Chicago', destination_state: 'IL' },
  { origin_city: 'Atlanta', origin_state: 'GA', destination_city: 'Dallas', destination_state: 'TX' },
  { origin_city: 'Columbus', origin_state: 'OH', destination_city: 'Nashville', destination_state: 'TN' },
  { origin_city: 'Indianapolis', origin_state: 'IN', destination_city: 'Louisville', destination_state: 'KY' }
];

async function testIntelligencePairingAPI() {
  console.log('🔄 Testing intelligence-pairing API with multiple city pairs...');
  
  // Try multiple city pairs to increase chance of success
  for (const cityPair of TEST_CITIES) {
    const payload = {
      lane_id: `test-${Date.now()}`,
      ...cityPair,
      equipment_code: 'V',
      test_mode: true,
      mock_auth: true
    };
    
    console.log('\n🔍 Testing city pair:', 
      `${payload.origin_city}, ${payload.origin_state} → ${payload.destination_city}, ${payload.destination_state}`);
    
    try {
      const response = await fetch('https://rapid-routes.vercel.app/api/intelligence-pairing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      
      console.log('📥 Response status:', response.status, response.statusText);
      
      const responseText = await response.text();
      
      try {
        const jsonResponse = JSON.parse(responseText);
        
        if (jsonResponse.success) {
          console.log('✅ SUCCESS! KMA lookup worked correctly');
          console.log('📋 KMA Results:', {
            origin_kma: jsonResponse.origin?.kma_code,
            origin_kma_name: jsonResponse.origin?.kma_name,
            destination_kma: jsonResponse.destination?.kma_code,
            destination_kma_name: jsonResponse.destination?.kma_name,
            processing_time: jsonResponse.processingTimeMs + 'ms'
          });
          // Success with one pair is enough to confirm API works
          return true;
        } else {
          console.error('❌ Error response:', jsonResponse.error);
          console.error('Details:', jsonResponse.details);
        }
        
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        console.log('Raw response:', responseText.substring(0, 200) + '...');
      }
    } catch (error) {
      console.error('❌ Request failed:', error);
    }
  }
  
  console.log('\n❌ All city pairs failed. Check database and API logs.');
  return false;
}

testIntelligencePairingAPI();
