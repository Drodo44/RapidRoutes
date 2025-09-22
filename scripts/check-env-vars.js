// Check the status of ALLOW_TEST_MODE environment variable
// This script will make a request to a special endpoint that echoes environment variables

import fetch from 'node-fetch';

async function checkEnvVars() {
  try {
    console.log('Checking if ALLOW_TEST_MODE is set in production...');
    
    // First test with test_mode parameter
    const response = await fetch('https://rapid-routes.vercel.app/api/intelligence-pairing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test_mode: true,
        originCity: 'Chicago',
        originState: 'IL',
        destCity: 'Atlanta',
        destState: 'GA',
        equipmentCode: 'FD'
      })
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(data, null, 2));
    
    if (data.error === 'Unauthorized') {
      console.log('\nDIAGNOSIS: ALLOW_TEST_MODE is either not set or not set to "true" in Vercel');
      console.log('Please add the ALLOW_TEST_MODE=true environment variable in Vercel dashboard.');
    } else {
      console.log('\nDIAGNOSIS: API is working as expected with test_mode.');
    }
    
  } catch (error) {
    console.error('Error checking environment variables:', error);
  }
}

checkEnvVars();