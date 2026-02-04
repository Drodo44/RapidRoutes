// Test script for intelligence-pairing.js
// Tests the different modes and fallback mechanisms

const http = require('http');
const querystring = require('querystring');

// Test cases
const testCases = [
  {
    name: 'Normal Operation',
    params: {
      origin_city: 'Chicago',
      origin_state: 'IL',
      dest_city: 'Atlanta', 
      dest_state: 'GA'
    }
  },
  {
    name: 'Force Emergency Mode',
    params: {
      origin_city: 'Chicago',
      origin_state: 'IL',
      dest_city: 'Atlanta', 
      dest_state: 'GA',
      force_emergency: 'true'
    }
  },
  {
    name: 'Edge Case - Small Cities',
    params: {
      origin_city: 'Peoria',
      origin_state: 'IL',
      dest_city: 'Macon', 
      dest_state: 'GA'
    }
  }
];

// Helper function to make API calls
function testIntelligencePairing(testCase) {
  return new Promise((resolve, reject) => {
    console.log(`\n======= Testing: ${testCase.name} =======`);
    
    // Build request data
    const postData = JSON.stringify(testCase.params);
    
    // Prepare the query string if any
    const queryParams = {};
    if (testCase.params.force_emergency) {
      queryParams.force_emergency = testCase.params.force_emergency;
    }
    
    const queryStr = Object.keys(queryParams).length > 0 
      ? '?' + querystring.stringify(queryParams) 
      : '';
    
    // Request options
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api/intelligence-pairing${queryStr}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          console.log(`Status Code: ${res.statusCode}`);
          console.log(`Data Source Type: ${responseData.metadata?.dataSourceType || 'Not reported'}`);
          console.log(`Fallback Reason: ${responseData.metadata?.fallbackReason || 'None'}`);
          console.log(`Origin KMAs: ${responseData.metadata?.uniqueOriginKmas || 0}`);
          console.log(`Destination KMAs: ${responseData.metadata?.uniqueDestKmas || 0}`);
          console.log(`Total Pairs: ${responseData.metadata?.totalCityPairs || 0}`);
          console.log(`Recovery Attempted: ${responseData.metadata?.recoveryAttempted ? 'Yes' : 'No'}`);
          resolve(responseData);
        } catch (e) {
          console.error('Error parsing response:', e);
          reject(e);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error: ${error.message}`);
      reject(error);
    });
    
    // Write data to request body
    req.write(postData);
    req.end();
  });
}

// Run tests sequentially
async function runTests() {
  console.log('Starting Intelligence Pairing API Tests...');
  
  for (const testCase of testCases) {
    try {
      await testIntelligencePairing(testCase);
    } catch (error) {
      console.error(`Test "${testCase.name}" failed:`, error);
    }
  }
  
  console.log('\nAll tests completed!');
}

runTests();
