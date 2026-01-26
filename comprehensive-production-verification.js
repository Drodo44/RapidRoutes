#!/usr/bin/env node

/**
 * Comprehensive RapidRoutes Production Verification
 * Tests all critical functionality for production readiness
 */

const PRODUCTION_URL = 'https://rapid-routes.vercel.app';

const tests = [
  // Authentication & Profile
  {
    category: 'Authentication',
    name: 'Auth Profile Endpoint',
    endpoint: '/api/auth/profile',
    method: 'GET',
    expectStatus: [200, 401], // 401 is OK if not authenticated
    critical: true
  },
  
  // Core Data APIs
  {
    category: 'Data APIs',
    name: 'Lanes API',
    endpoint: '/api/lanes',
    method: 'GET',
    expectStatus: [200, 401],
    critical: true
  },
  {
    category: 'Data APIs',
    name: 'Cities API',
    endpoint: '/api/cities',
    method: 'GET',
    expectStatus: [200, 401],
    critical: true
  },
  {
    category: 'Data APIs',
    name: 'Equipment Codes',
    endpoint: '/api/admin/equipment',
    method: 'GET',
    expectStatus: [200, 401, 403],
    critical: false
  },
  
  // AI Orchestration
  {
    category: 'AI Services',
    name: 'AI Analytics',
    endpoint: '/api/ai/analytics',
    method: 'GET',
    expectStatus: [200],
    critical: true
  },
  {
    category: 'AI Services',
    name: 'AI Recap Generation',
    endpoint: '/api/ai/recap',
    method: 'POST',
    body: { laneId: 'test-validation' },
    expectStatus: [200, 400, 401], // 400 for invalid laneId is OK
    critical: true
  },
  
  // System Health
  {
    category: 'System Health',
    name: 'Health Check',
    endpoint: '/api/health',
    method: 'GET',
    expectStatus: [200, 503],
    critical: false
  },
  {
    category: 'System Health',
    name: 'Environment Check',
    endpoint: '/api/env-check',
    method: 'GET',
    expectStatus: [200],
    critical: true
  },
  
  // Broker Stats
  {
    category: 'Dashboard',
    name: 'Broker Stats',
    endpoint: '/api/brokerStats',
    method: 'GET',
    expectStatus: [200, 401],
    critical: true
  },
  
  // Export Functions
  {
    category: 'Export',
    name: 'Export Head',
    endpoint: '/api/exportHead',
    method: 'GET',
    expectStatus: [200, 401],
    critical: false
  }
];

const results = {
  passed: [],
  failed: [],
  warnings: [],
  errors: []
};

async function testEndpoint(test) {
  try {
    console.log(`\n🧪 [${test.category}] ${test.name}`);
    console.log(`   Method: ${test.method} ${test.endpoint}`);
    
    const options = {
      method: test.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (test.body) {
      options.body = JSON.stringify(test.body);
    }
    
    const response = await fetch(`${PRODUCTION_URL}${test.endpoint}`, options);
    const status = response.status;
    const contentType = response.headers.get('content-type');
    
    let data;
    try {
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
    } catch (e) {
      data = { error: 'Could not parse response', parseError: e.message };
    }
    
    const statusOk = test.expectStatus.includes(status);
    
    if (statusOk) {
      console.log(`   ✅ PASS - Status ${status}`);
      
      // Check for admin client errors in response
      const responseStr = JSON.stringify(data);
      if (responseStr.includes('SUPABASE_SERVICE_ROLE_KEY') && 
          responseStr.includes('Missing')) {
        console.log(`   ❌ ADMIN CLIENT ERROR DETECTED!`);
        console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 500));
        results.errors.push({
          test: test.name,
          category: test.category,
          endpoint: test.endpoint,
          error: 'Admin client error in response',
          response: data
        });
        return { passed: false, critical: test.critical };
      }
      
      // Check for other error patterns
      if (responseStr.includes('supabase is not defined')) {
        console.log(`   ⚠️  Supabase client initialization error`);
        results.warnings.push({
          test: test.name,
          category: test.category,
          warning: 'Supabase client undefined',
          response: data
        });
      }
      
      results.passed.push({
        test: test.name,
        category: test.category,
        status,
        critical: test.critical
      });
      
      return { passed: true, critical: test.critical };
    } else {
      console.log(`   ❌ FAIL - Status ${status} (expected: ${test.expectStatus.join(' or ')})`);
      console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 500));
      
      results.failed.push({
        test: test.name,
        category: test.category,
        endpoint: test.endpoint,
        status,
        expectedStatus: test.expectStatus,
        response: data,
        critical: test.critical
      });
      
      return { passed: false, critical: test.critical };
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    
    results.errors.push({
      test: test.name,
      category: test.category,
      endpoint: test.endpoint,
      error: error.message,
      critical: test.critical
    });
    
    return { passed: false, critical: test.critical };
  }
}

async function checkPageLoad(url, pageName) {
  try {
    console.log(`\n🌐 Testing Page: ${pageName}`);
    console.log(`   URL: ${url}`);
    
    const response = await fetch(url);
    const status = response.status;
    const html = await response.text();
    
    if (status === 200) {
      console.log(`   ✅ Page loads (${status})`);
      
      // Check for common error patterns in HTML
      if (html.includes('Application error') || html.includes('500')) {
        console.log(`   ⚠️  Page may contain errors`);
        return false;
      }
      return true;
    } else {
      console.log(`   ❌ Page failed to load (${status})`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 RapidRoutes Comprehensive Production Verification');
  console.log('   URL: ' + PRODUCTION_URL);
  console.log('   Date: ' + new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════════');
  
  // Test page loads
  console.log('\n📄 PAGE LOAD TESTS');
  console.log('─────────────────────────────────────────────────────────────');
  await checkPageLoad(PRODUCTION_URL, 'Home Page');
  await checkPageLoad(`${PRODUCTION_URL}/login`, 'Login Page');
  await checkPageLoad(`${PRODUCTION_URL}/dashboard`, 'Dashboard');
  await checkPageLoad(`${PRODUCTION_URL}/lanes`, 'Lanes Page');
  await checkPageLoad(`${PRODUCTION_URL}/recap`, 'Recap Page');
  await checkPageLoad(`${PRODUCTION_URL}/ai/analytics`, 'AI Analytics Dashboard');
  
  // Test API endpoints
  console.log('\n\n🔌 API ENDPOINT TESTS');
  console.log('─────────────────────────────────────────────────────────────');
  
  for (const test of tests) {
    await testEndpoint(test);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Generate report
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('📊 VERIFICATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════');
  
  console.log(`\n✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);
  console.log(`🔴 Errors: ${results.errors.length}`);
  
  // Critical failures
  const criticalFailures = results.failed.filter(f => f.critical);
  const criticalErrors = results.errors.filter(e => e.critical);
  
  if (criticalFailures.length > 0) {
    console.log('\n\n🔴 CRITICAL FAILURES:');
    console.log('─────────────────────────────────────────────────────────────');
    criticalFailures.forEach(f => {
      console.log(`\n❌ ${f.test} (${f.category})`);
      console.log(`   Endpoint: ${f.endpoint}`);
      console.log(`   Status: ${f.status} (expected: ${f.expectedStatus.join(' or ')})`);
      console.log(`   Response:`, JSON.stringify(f.response, null, 2).substring(0, 300));
    });
  }
  
  if (criticalErrors.length > 0) {
    console.log('\n\n🔴 CRITICAL ERRORS:');
    console.log('─────────────────────────────────────────────────────────────');
    criticalErrors.forEach(e => {
      console.log(`\n❌ ${e.test} (${e.category})`);
      console.log(`   Endpoint: ${e.endpoint}`);
      console.log(`   Error: ${e.error}`);
      if (e.response) {
        console.log(`   Response:`, JSON.stringify(e.response, null, 2).substring(0, 300));
      }
    });
  }
  
  if (results.warnings.length > 0) {
    console.log('\n\n⚠️  WARNINGS:');
    console.log('─────────────────────────────────────────────────────────────');
    results.warnings.forEach(w => {
      console.log(`\n⚠️  ${w.test} (${w.category})`);
      console.log(`   Warning: ${w.warning}`);
    });
  }
  
  // Deployment Status
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('🎯 DEPLOYMENT READINESS STATUS');
  console.log('═══════════════════════════════════════════════════════════════');
  
  let status = 'GREEN';
  let statusEmoji = '🟢';
  
  if (criticalFailures.length > 0 || criticalErrors.length > 0) {
    status = 'RED';
    statusEmoji = '🔴';
    console.log(`\n${statusEmoji} Status: ${status}`);
    console.log('   Critical issues detected. Not ready for production use.');
    console.log(`   Critical failures: ${criticalFailures.length}`);
    console.log(`   Critical errors: ${criticalErrors.length}`);
  } else if (results.failed.length > 0 || results.warnings.length > 0) {
    status = 'YELLOW';
    statusEmoji = '🟡';
    console.log(`\n${statusEmoji} Status: ${status}`);
    console.log('   Non-critical issues detected. Production functional but needs attention.');
    console.log(`   Non-critical failures: ${results.failed.length}`);
    console.log(`   Warnings: ${results.warnings.length}`);
  } else {
    console.log(`\n${statusEmoji} Status: ${status}`);
    console.log('   All critical tests passed. Production ready.');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════\n');
  
  // Exit code
  if (status === 'RED') {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
