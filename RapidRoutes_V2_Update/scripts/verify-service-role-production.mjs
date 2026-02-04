#!/usr/bin/env node

/**
 * Verify SUPABASE_SERVICE_ROLE_KEY is properly configured in production
 * 
 * Usage: node scripts/verify-service-role-production.mjs
 */

const PRODUCTION_URL = 'https://rapid-routes.vercel.app';

console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
console.log('║                                                                           ║');
console.log('║        🔐 Production SERVICE_ROLE_KEY Verification Test 🔐               ║');
console.log('║                                                                           ║');
console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');

console.log('🎯 Target: ' + PRODUCTION_URL);
console.log('⏰ Testing admin operations that require service role key...\n');

async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    const response = await fetch(url);
    const status = response.status;
    const success = status === expectedStatus;
    
    console.log(success ? '✅' : '❌', name);
    console.log('   Status:', status, success ? '(expected)' : `(expected ${expectedStatus})`);
    
    if (!success) {
      const text = await response.text();
      console.log('   Response:', text.substring(0, 200));
    }
    
    return success;
  } catch (error) {
    console.log('❌', name);
    console.log('   Error:', error.message);
    return false;
  }
}

async function runTests() {
  const results = [];
  
  console.log('━━━ Testing Admin-Required Endpoints ━━━\n');
  
  // Test 1: City Performance (uses adminSupabase)
  results.push(await testEndpoint(
    'City Performance API',
    `${PRODUCTION_URL}/api/city-performance`,
    200
  ));
  console.log('');
  
  // Test 2: Lanes API (uses adminSupabase for reads)
  results.push(await testEndpoint(
    'Lanes API',
    `${PRODUCTION_URL}/api/lanes`,
    200
  ));
  console.log('');
  
  // Test 3: Environment Check
  results.push(await testEndpoint(
    'Environment Check',
    `${PRODUCTION_URL}/api/check-env`,
    200
  ));
  console.log('');
  
  // Test 4: Health Check
  results.push(await testEndpoint(
    'Health Check',
    `${PRODUCTION_URL}/api/health`,
    200
  ));
  console.log('');
  
  console.log('━━━ Summary ━━━\n');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);
  
  console.log(`✅ Passed: ${passed}/${total} (${percentage}%)`);
  
  if (passed === total) {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                           ║');
    console.log('║              ✅ SERVICE_ROLE_KEY VERIFIED IN PRODUCTION ✅                ║');
    console.log('║                                                                           ║');
    console.log('║  All admin operations working correctly!                                 ║');
    console.log('║  Environment variable is properly configured.                            ║');
    console.log('║                                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');
  } else {
    console.log('\n╔═══════════════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                           ║');
    console.log('║              ⚠️  SERVICE_ROLE_KEY MAY NOT BE CONFIGURED ⚠️                ║');
    console.log('║                                                                           ║');
    console.log('║  Some admin operations failed.                                           ║');
    console.log('║  Please verify the environment variable in Vercel.                       ║');
    console.log('║                                                                           ║');
    console.log('║  Steps:                                                                   ║');
    console.log('║  1. Go to Vercel Dashboard → Settings → Environment Variables            ║');
    console.log('║  2. Verify SUPABASE_SERVICE_ROLE_KEY exists (NO NEXT_PUBLIC_ prefix)     ║');
    console.log('║  3. Redeploy the project                                                  ║');
    console.log('║  4. Run this script again                                                 ║');
    console.log('║                                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════════════════════╝\n');
  }
  
  process.exit(passed === total ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test runner failed:', error.message);
  process.exit(1);
});
