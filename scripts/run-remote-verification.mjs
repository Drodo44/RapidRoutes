#!/usr/bin/env node
/**
 * RapidRoutes Intelligence API Remote Verification
 * 
 * This script calls the server-side verification endpoint
 * which runs in the production environment for accurate testing
 */

import fetch from 'node-fetch';
import fs from 'fs';

// Verify environment variables
const requiredEnvVars = ['TEST_USER_EMAIL', 'TEST_USER_PASSWORD'];
const missingEnvVars = [];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    missingEnvVars.push(envVar);
  }
}

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please set these environment variables and try again.');
  process.exit(1);
}

const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;

// Remote verification endpoint URL
const VERIFY_URL = process.env.VERIFY_URL || 'https://rapid-routes.vercel.app/api/verify-api';

async function runRemoteVerification() {
  console.log('🚀 Starting remote intelligence API verification');
  console.log(`- Using endpoint: ${VERIFY_URL}`);
  console.log(`- Email: ${EMAIL.substring(0, 3)}***${EMAIL.substring(EMAIL.indexOf('@'))}`);
  
  try {
    // Make request to verification endpoint
    console.log('\n🔄 Calling verification endpoint...');
    const startTime = Date.now();
    
    // Use POST for more security in real scenarios
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD
      })
    });
    
    const verificationTime = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`Verification endpoint returned ${response.status}: ${await response.text()}`);
    }
    
    const results = await response.json();
    console.log(`✅ Received response in ${verificationTime}ms`);
    
    // Save results
    const resultsFile = 'diagnostic-intelligence-result.json';
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    console.log(`📊 Full diagnostic results saved to ${resultsFile}`);
    
    // Display summary
    console.log('\n📋 Verification Summary:');
    console.log(`- Authentication: ${results.auth.status === 'ok' ? '✅ Successful' : '❌ Failed'}`);
    
    if (results.auth.error) {
      console.log(`  Error: ${results.auth.error}`);
    }
    
    console.log(`- API Status: ${results.api.status === 200 ? '✅ 200 OK' : `❌ ${results.api.status}`}`);
    
    if (results.api.error) {
      console.log(`  Error: ${results.api.error}`);
    }
    
    if (results.pairs_count > 0) {
      console.log(`- Pairs Generated: ${results.pairs_count} ✅`);
      console.log(`- Unique KMAs: ${results.unique_kmas} ${results.unique_kmas >= 5 ? '✅' : '❌'}`);
      
      // Show KMA distribution
      if (results.kma_details.length > 0) {
        console.log('\n📊 KMA Distribution:');
        results.kma_details.forEach(kma => {
          console.log(`  - ${kma.code}: ${kma.origin_count} origins, ${kma.dest_count} destinations`);
        });
      }
      
      // Show sample pair
      if (results.sample_pairs.length > 0) {
        const sample = results.sample_pairs[0];
        console.log('\n📍 Sample Pair:');
        console.log(`  Origin: ${sample.origin_city || sample.originCity}, ${sample.origin_state || sample.originState} (KMA: ${sample.origin_kma || sample.originKma})`);
        console.log(`  Destination: ${sample.dest_city || sample.destCity}, ${sample.dest_state || sample.destState} (KMA: ${sample.dest_kma || sample.destKma})`);
        console.log(`  Equipment: ${sample.equipment_code || sample.equipmentCode}`);
      }
    }
    
    // Show suggested next steps
    if (results.suggested_next_steps.length > 0) {
      console.log('\n📝 Suggested Next Steps:');
      results.suggested_next_steps.forEach((step, i) => {
        console.log(`  ${i+1}. ${step}`);
      });
    }
    
    // Final status
    if (results.auth.status === 'ok' && results.api.status === 200 && results.unique_kmas >= 5) {
      console.log('\n🎉 VERIFICATION SUCCESSFUL!');
      console.log('Intelligence API is working correctly in production.');
    } else {
      console.log('\n❌ VERIFICATION FAILED');
      console.log('See details above for issues that need to be addressed.');
    }
    
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`);
  }
}

runRemoteVerification().catch(console.error);