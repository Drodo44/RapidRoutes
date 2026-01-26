#!/usr/bin/env node

/**
 * Production Verification Script
 * Tests that the Supabase admin client fix is working in production
 */

const PRODUCTION_URL = 'https://rapid-routes.vercel.app';

const tests = [
  {
    name: 'Health Check',
    endpoint: '/api/health',
    expectSuccess: true
  },
  {
    name: 'Environment Check',
    endpoint: '/api/env-check',
    expectSuccess: true
  },
  {
    name: 'AI Analytics',
    endpoint: '/api/ai/analytics',
    expectSuccess: true
  }
];

async function runTest(test) {
  try {
    console.log(`\n🧪 Testing: ${test.name}`);
    console.log(`   Endpoint: ${test.endpoint}`);
    
    const response = await fetch(`${PRODUCTION_URL}${test.endpoint}`);
    const status = response.status;
    const data = await response.json();
    
    if (test.expectSuccess && status === 200) {
      console.log(`   ✅ PASS - Status ${status}`);
      
      // Check for admin client errors
      const responseText = JSON.stringify(data);
      if (responseText.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        console.log(`   ⚠️  Warning: Response contains service role key reference`);
        console.log(`   Response snippet:`, responseText.substring(0, 200));
      } else if (responseText.includes('Missing') && responseText.includes('key')) {
        console.log(`   ❌ FAIL: Response contains "Missing key" error`);
        console.log(`   Response:`, data);
        return false;
      } else {
        console.log(`   ✅ No admin client errors detected`);
      }
      return true;
    } else {
      console.log(`   ❌ FAIL - Status ${status}`);
      console.log(`   Response:`, data);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 RapidRoutes Production Verification');
  console.log('   Verifying Supabase Admin Client Fix');
  console.log('═══════════════════════════════════════════════════════');
  
  let passCount = 0;
  let failCount = 0;
  
  for (const test of tests) {
    const passed = await runTest(test);
    if (passed) {
      passCount++;
    } else {
      failCount++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 Test Results');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 All tests passed! Production deployment is successful.');
    console.log('✅ No Supabase admin client errors detected');
    console.log('✅ API endpoints responding correctly');
    console.log('\nNext steps:');
    console.log('1. Test login at https://rapid-routes.vercel.app/login');
    console.log('2. Check browser console for any client-side errors');
    console.log('3. Verify dashboard loads data correctly');
  } else {
    console.log('\n⚠️  Some tests failed. Review the errors above.');
    process.exit(1);
  }
}

main().catch(console.error);
