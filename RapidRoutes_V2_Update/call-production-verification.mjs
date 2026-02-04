// call-production-verification.mjs
// Script to call the production verification endpoint

import fetch from 'node-fetch';
import fs from 'fs/promises';

const API_URL = 'https://rapid-routes.vercel.app/api/production-verification';
const API_KEY = process.env.VERIFICATION_API_KEY || 'dev-verification-key';
const OUTPUT_FILE = 'verification-results.json';

async function runVerification() {
  console.log('🚀 Starting RapidRoutes Production Verification');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🌐 API URL:', API_URL);
  console.log('🔄 Running verification...');
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Verification completed successfully!');
      
      // Print KMA diversity results
      console.log('\n📊 KMA Diversity Results:');
      if (data.results && data.results.kmaValidation) {
        data.results.kmaValidation.forEach(test => {
          const status = test.meetsRequirement ? '✅' : '❌';
          console.log(`${status} ${test.testName}: ${test.uniqueKmaCount} unique KMAs`);
        });
      }
      
      // Print overall summary
      console.log('\n📝 Verification Summary:');
      if (data.results && data.results.summary) {
        const summary = data.results.summary;
        console.log(`- Authentication: ${summary.authenticationSuccessful ? '✅ Successful' : '❌ Failed'}`);
        console.log(`- KMA Diversity: ${summary.uniqueKmaRequirementMet ? '✅ Requirements Met' : '❌ Requirements Not Met'}`);
        console.log(`- Tests: ${summary.passedTests}/${summary.totalTests} passed`);
        console.log(`- Overall: ${summary.overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);
      }
      
      // Save detailed results to file
      await fs.writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2));
      console.log(`\n📄 Detailed results saved to ${OUTPUT_FILE}`);
      
    } else {
      console.log('❌ Verification failed:');
      console.error(data.error || 'Unknown error');
      if (data.details) {
        console.error('Details:', data.details);
      }
      
      // Check if this was an authentication failure but a security test success
      if (data.securityTest) {
        console.log(`✅ ${data.securityTest}`);
      }
      
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error running verification:', error);
    process.exit(1);
  }
}

runVerification().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});