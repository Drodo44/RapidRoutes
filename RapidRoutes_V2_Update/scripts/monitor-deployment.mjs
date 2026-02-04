// Monitor deployment status and test when ready
import fetch from 'node-fetch';

const API_URL = 'https://rapid-routes.vercel.app/api/intelligence-pairing';
const CHECK_ENV_URL = 'https://rapid-routes.vercel.app/api/check-env';
const MAX_ATTEMPTS = 10;
const DELAY_SECONDS = 20;

const testData = {
  test_mode: true,
  originCity: "Chicago",
  originState: "IL",
  destCity: "Atlanta", 
  destState: "GA",
  equipmentCode: "FD"
};

async function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

async function checkEnvEndpoint() {
  try {
    console.log(`Checking environment endpoint: ${CHECK_ENV_URL}`);
    const response = await fetch(CHECK_ENV_URL);
    
    if (response.status === 404) {
      console.log('❌ Environment endpoint not deployed yet (404)');
      return false;
    }
    
    const data = await response.json();
    console.log('Environment variables:', data);
    
    if (data.environment && data.environment.ALLOW_TEST_MODE === 'true') {
      console.log('✅ ALLOW_TEST_MODE is set to true!');
      return true;
    } else {
      console.log('❌ ALLOW_TEST_MODE is not set correctly');
      return false;
    }
  } catch (error) {
    console.log('❌ Error checking environment:', error.message);
    return false;
  }
}

async function testAPI() {
  try {
    console.log(`Testing API: ${API_URL}`);
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log(`Response status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('❌ Still getting 401 Unauthorized');
      return false;
    }
    
    const data = await response.json();
    console.log('API response:', JSON.stringify(data, null, 2));
    
    if (data.success && data.pairs && Array.isArray(data.pairs)) {
      // Count unique KMAs
      const kmas = new Set();
      data.pairs.forEach(pair => {
        if (pair.origin && pair.origin.kma_code) kmas.add(pair.origin.kma_code);
        if (pair.destination && pair.destination.kma_code) kmas.add(pair.destination.kma_code);
      });
      
      console.log(`✅ API returned ${data.pairs.length} pairs with ${kmas.size} unique KMAs`);
      return kmas.size >= 6;
    } else {
      console.log('❌ API did not return valid pairs');
      return false;
    }
  } catch (error) {
    console.log('❌ Error testing API:', error.message);
    return false;
  }
}

async function monitorDeployment() {
  console.log('Starting deployment monitoring...');
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n[Attempt ${attempt}/${MAX_ATTEMPTS}] Checking deployment status...`);
    
    // First check if the environment endpoint is available
    const envReady = await checkEnvEndpoint();
    
    // Then test the API if env is ready
    if (envReady) {
      console.log('Environment looks good, testing API...');
      const apiSuccess = await testAPI();
      
      if (apiSuccess) {
        console.log('\n✅✅✅ DEPLOYMENT VERIFIED SUCCESSFULLY! ✅✅✅');
        console.log('KMA diversity requirement met (6+ unique KMAs)');
        return true;
      }
    }
    
    if (attempt < MAX_ATTEMPTS) {
      console.log(`Waiting ${DELAY_SECONDS} seconds before next check...`);
      await sleep(DELAY_SECONDS);
    }
  }
  
  console.log('\n❌ Maximum attempts reached. Deployment verification failed.');
  console.log('Please check Vercel dashboard for deployment status.');
  return false;
}

// Start monitoring
monitorDeployment();