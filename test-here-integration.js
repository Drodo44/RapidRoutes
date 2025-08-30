// Quick test to verify HERE.com integration is working in production
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testHereIntegration() {
  console.log('🔍 TESTING HERE.COM INTEGRATION IN PRODUCTION');
  console.log('=============================================');
  
  // Test 1: Environment variables
  console.log('1. Environment Check:');
  console.log('   HERE_API_KEY configured:', !!process.env.HERE_API_KEY);
  console.log('   Key prefix:', process.env.HERE_API_KEY?.substring(0, 10) + '...' || 'MISSING');
  
  // Test 2: Direct HERE.com verification
  console.log('\n2. Direct HERE.com Test:');
  try {
    const { verifyCityWithHERE } = await import('./lib/hereVerificationService.js');
    const testResult = await verifyCityWithHERE('Alamo', 'TX', '', 'test', 'system');
    console.log('   Alamo, TX verification:', testResult.verified ? '✅ VERIFIED' : '❌ FAILED');
    console.log('   Details:', testResult);
  } catch (error) {
    console.log('   ❌ HERE.com service error:', error.message);
  }
  
  // Test 3: Intelligent crawl system
  console.log('\n3. Intelligent Crawl Test:');
  try {
    const { generateIntelligentCrawlPairs } = await import('./lib/intelligentCrawl.js');
    const crawlResult = await generateIntelligentCrawlPairs({
      origin: { city: 'Seaboard', state: 'NC' },
      destination: { city: 'Oxford', state: 'PA' },
      equipment: 'FD',
      preferFillTo10: true,
      usedCities: new Set()
    });
    console.log('   Crawl pairs generated:', crawlResult?.length || crawlResult?.pairs?.length || 0);
    console.log('   Base cities resolved:', !!crawlResult?.baseOrigin);
  } catch (error) {
    console.log('   ❌ Crawl system error:', error.message);
  }
}

testHereIntegration();
