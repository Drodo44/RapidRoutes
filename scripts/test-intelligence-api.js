// Test file for intelligence-pairing API
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testIntelligencePairing() {
  console.log('Testing intelligence-pairing API endpoint...');
  
  // Test with a known city pair
  const testData = {
    originCity: 'Chicago',
    originState: 'IL',
    destCity: 'Atlanta',
    destState: 'GA'
  };
  
  try {
    // Mock API authentication if required
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': 'test-api-key' // Add real key or authentication as needed
    };
    
    console.log('Making API request with data:', testData);
    
    const response = await fetch('http://localhost:3000/api/intelligence-pairing', {
      method: 'POST',
      headers,
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      console.error('API error:', result);
      process.exit(1);
    }
    
    console.log('Success:', result.success);
    console.log('Number of pairs:', result.count);
    
    if (result.pairs && result.pairs.length > 0) {
      console.log('First pair sample:');
      console.log(JSON.stringify(result.pairs[0], null, 2));
    }
    
    if (result.count < 6) {
      console.error('Error: Insufficient pairs generated (minimum 6 required)');
      process.exit(1);
    }
    
    console.log('✅ API test successful');
    
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testIntelligencePairing().catch(console.error);