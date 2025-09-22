// verify-deployment-fix.mjs
// Script to verify that the deployment fix was successful

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env file if available
dotenv.config();

// Constants
const VERCEL_URL = process.env.VERCEL_URL || 'rapid-routes.vercel.app';
const API_URL = `https://${VERCEL_URL}/api/intelligence-pairing`;
const VERIFICATION_URL = `https://${VERCEL_URL}/api/production-verification`;
const VERIFICATION_API_KEY = process.env.VERIFICATION_API_KEY || 'verification-key';

// Test lane data
const testLane = {
  originCity: 'Cincinnati',
  originState: 'OH',
  destCity: 'Philadelphia',
  destState: 'PA',
  equipmentCode: 'V',
  test_mode: true
};

/**
 * Delay execution for the specified time
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after the delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test the intelligence-pairing API with test_mode
 */
async function testIntelligenceApi() {
  console.log('\n============================');
  console.log('= TESTING INTELLIGENCE API =');
  console.log('============================');
  
  try {
    console.log(`Making request to ${API_URL}`);
    console.log('Using test_mode: true');
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...testLane
      })
    });
    
    console.log(`Response status: ${response.status}`);
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Intelligence API test succeeded!');
      console.log(`✅ Received ${data.pairs?.length || 0} pairs`);
      
      // Check KMA diversity
      const kmas = new Set();
      data.pairs?.forEach(pair => {
        if (pair.originKma) kmas.add(pair.originKma);
        if (pair.destKma) kmas.add(pair.destKma);
      });
      
      console.log(`✅ KMA diversity: ${kmas.size} unique KMAs`);
      console.log(`✅ KMA diversity requirement met: ${kmas.size >= 6}`);
      
      return true;
    } else {
      console.log('❌ Intelligence API test failed');
      console.log('Error:', data.error || 'Unknown error');
      console.log('Details:', data.details || 'No details');
      return false;
    }
  } catch (error) {
    console.log('❌ Exception during intelligence API test:', error.message);
    return false;
  }
}

/**
 * Test the production-verification API
 */
async function testProductionVerification() {
  console.log('\n================================');
  console.log('= TESTING PRODUCTION VERIFICATION API =');
  console.log('================================');
  
  try {
    console.log(`Making request to ${VERIFICATION_URL}`);
    
    const response = await fetch(VERIFICATION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': VERIFICATION_API_KEY
      },
      body: JSON.stringify({ runAll: true })
    });
    
    console.log(`Response status: ${response.status}`);
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Production verification test succeeded!');
      console.log('✅ Environment verified');
      
      if (data.results && Array.isArray(data.results)) {
        const passedTests = data.results.filter(t => t.success).length;
        const totalTests = data.results.length;
        console.log(`✅ ${passedTests}/${totalTests} tests passed`);
      }
      
      return true;
    } else {
      console.log('❌ Production verification test failed');
      console.log('Error:', data.error || 'Unknown error');
      console.log('Details:', data.details || 'No details');
      return false;
    }
  } catch (error) {
    console.log('❌ Exception during production verification test:', error.message);
    return false;
  }
}

/**
 * Check if ALLOW_TEST_MODE is enabled
 */
async function checkTestModeEnabled() {
  console.log('\n============================');
  console.log('= CHECKING TEST MODE STATUS =');
  console.log('============================');
  
  try {
    const response = await fetch(`https://${VERCEL_URL}/api/check-env`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      console.log('❌ Could not check environment - endpoint may not exist');
      console.log('🔄 Falling back to testing intelligence API directly');
      return await testIntelligenceApi();
    }
    
    const data = await response.json();
    
    if (data.ALLOW_TEST_MODE === 'true') {
      console.log('✅ ALLOW_TEST_MODE is enabled');
      return true;
    } else {
      console.log('❌ ALLOW_TEST_MODE is not enabled');
      return false;
    }
  } catch (error) {
    console.log('❌ Exception during test mode check:', error.message);
    console.log('🔄 Falling back to testing intelligence API directly');
    return await testIntelligenceApi();
  }
}

/**
 * Main function to run all verification tests
 */
async function verifyDeployment() {
  console.log('==================================');
  console.log('= VERIFYING DEPLOYMENT FIX =');
  console.log('==================================');
  console.log(`Target Environment: ${VERCEL_URL}`);
  console.log('==================================\n');
  
  console.log('1️⃣ Checking if deployment is ready...');
  
  let attempts = 0;
  let deploymentReady = false;
  
  while (attempts < 5 && !deploymentReady) {
    try {
      attempts++;
      console.log(`Attempt ${attempts}/5`);
      
      const response = await fetch(`https://${VERCEL_URL}`);
      
      if (response.ok) {
        console.log('✅ Deployment is accessible');
        deploymentReady = true;
      } else {
        console.log('⏳ Deployment not ready yet, waiting 10 seconds...');
        await delay(10000);
      }
    } catch (error) {
      console.log(`⏳ Deployment not ready yet (${error.message}), waiting 10 seconds...`);
      await delay(10000);
    }
  }
  
  if (!deploymentReady) {
    console.log('❌ Deployment is not accessible after 5 attempts');
    console.log('Please check the Vercel dashboard for build errors');
    return false;
  }
  
  console.log('\n2️⃣ Checking if test mode is enabled...');
  const testModeEnabled = await checkTestModeEnabled();
  
  console.log('\n3️⃣ Testing intelligence API with test_mode...');
  const intelligenceApiWorks = await testIntelligenceApi();
  
  console.log('\n4️⃣ Testing production verification API...');
  const productionVerificationWorks = await testProductionVerification();
  
  console.log('\n==================================');
  console.log('= VERIFICATION RESULTS =');
  console.log('==================================');
  console.log(`✅ Deployment accessible: ${deploymentReady ? 'YES' : 'NO'}`);
  console.log(`✅ Test mode enabled: ${testModeEnabled ? 'YES' : 'NO'}`);
  console.log(`✅ Intelligence API works: ${intelligenceApiWorks ? 'YES' : 'NO'}`);
  console.log(`✅ Production verification works: ${productionVerificationWorks ? 'YES' : 'NO'}`);
  
  const allPassed = deploymentReady && testModeEnabled && intelligenceApiWorks && productionVerificationWorks;
  
  if (allPassed) {
    console.log('\n✅✅✅ ALL TESTS PASSED! The deployment fix was successful.');
  } else {
    console.log('\n❌❌❌ SOME TESTS FAILED. Please check the logs above for details.');
  }
  
  return allPassed;
}

// Run the verification
verifyDeployment().catch(error => {
  console.error('Fatal error during verification:', error);
  process.exit(1);
});