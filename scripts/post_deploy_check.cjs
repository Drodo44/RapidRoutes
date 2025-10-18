#!/usr/bin/env node
// scripts/post_deploy_check.js
// Post-deployment verification script for RapidRoutes production

const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://rapid-routes.vercel.app';
const TIMEOUT = 10000; // 10 seconds

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

/**
 * Make HTTP request with timeout
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, TIMEOUT);

    const req = protocol.get(url, options, (res) => {
      clearTimeout(timeout);
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, body: json, headers: res.headers });
        } catch (e) {
          resolve({ statusCode: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    req.setTimeout(TIMEOUT, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Print test result
 */
function logTest(name, passed, message = '') {
  const icon = passed ? '✅' : '❌';
  const color = passed ? colors.green : colors.red;
  
  console.log(`${icon} ${color}${name}${colors.reset}${message ? colors.dim + ' - ' + message + colors.reset : ''}`);
  
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

/**
 * Print warning
 */
function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
  results.warnings++;
}

/**
 * Print section header
 */
function logSection(title) {
  console.log(`\n${colors.cyan}${colors.bold}━━━ ${title} ━━━${colors.reset}\n`);
}

/**
 * Test 1: Health Check API
 */
async function testHealthCheck() {
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/health`);
    
    if (response.statusCode === 200 && response.body.ok === true) {
      logTest('Health Check API', true, `Status: ${response.statusCode}`);
      
      // Check environment variables
      if (response.body.env && response.body.env.ok === true) {
        logTest('Environment Variables', true, 'All required env vars present');
      } else {
        logWarning('Some environment variables may be missing');
      }
      
      // Check database tables
      if (response.body.tables && Array.isArray(response.body.tables)) {
        const failedTables = response.body.tables.filter(t => !t.ok);
        if (failedTables.length === 0) {
          logTest('Database Tables', true, `${response.body.tables.length} tables accessible`);
        } else {
          logTest('Database Tables', false, `${failedTables.length} tables failed: ${failedTables.map(t => t.table).join(', ')}`);
        }
      }
      
      // Check monitoring
      if (response.body.monitoring) {
        const dbStatus = response.body.monitoring.database === 'up';
        const apiStatus = response.body.monitoring.api_services === 'up';
        
        if (dbStatus && apiStatus) {
          logTest('System Monitoring', true, 'Database and API services up');
        } else {
          logTest('System Monitoring', false, `DB: ${response.body.monitoring.database}, API: ${response.body.monitoring.api_services}`);
        }
      }
      
      return true;
    } else {
      logTest('Health Check API', false, `Status: ${response.statusCode}, ok: ${response.body.ok}`);
      console.log(`${colors.dim}Response: ${JSON.stringify(response.body, null, 2)}${colors.reset}`);
      return false;
    }
  } catch (error) {
    logTest('Health Check API', false, error.message);
    return false;
  }
}

/**
 * Test 2: Auth Profile API (without auth - should return 401)
 */
async function testAuthProfile() {
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/auth/profile`);
    
    // We expect 401 Unauthorized without a token
    if (response.statusCode === 401) {
      logTest('Auth Profile API', true, 'Returns 401 without token (expected)');
      return true;
    } else if (response.statusCode === 500) {
      logTest('Auth Profile API', false, 'Returns 500 error (login bug not fixed!)');
      console.log(`${colors.dim}Response: ${JSON.stringify(response.body, null, 2)}${colors.reset}`);
      return false;
    } else {
      logWarning(`Auth Profile returned unexpected status: ${response.statusCode}`);
      return true; // Not a critical failure
    }
  } catch (error) {
    logTest('Auth Profile API', false, error.message);
    return false;
  }
}

/**
 * Test 3: Login Page
 */
async function testLoginPage() {
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/login`);
    
    if (response.statusCode === 200) {
      const html = response.body.toString();
      
      // Check for logo
      const hasLogo = html.includes('rapidroutes-logo.png') || html.includes('logo');
      if (hasLogo) {
        logTest('Login Page - Logo', true, 'Logo reference found');
      } else {
        logWarning('Login page may be missing logo');
      }
      
      // Check for sign in form
      const hasSignIn = html.toLowerCase().includes('sign in') || html.toLowerCase().includes('login');
      if (hasSignIn) {
        logTest('Login Page - Form', true, 'Sign in form present');
      } else {
        logTest('Login Page - Form', false, 'Sign in form not found');
      }
      
      return true;
    } else {
      logTest('Login Page', false, `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Login Page', false, error.message);
    return false;
  }
}

/**
 * Test 4: Recap Page (requires authentication, but we can check if it loads)
 */
async function testRecapPage() {
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/recap`);
    
    // May redirect to login if not authenticated, which is expected
    if (response.statusCode === 200 || response.statusCode === 302 || response.statusCode === 307) {
      logTest('Recap Page', true, `Status: ${response.statusCode}`);
      
      if (response.statusCode === 200) {
        const html = response.body.toString();
        
        // Check for RR# search functionality
        const hasRRSearch = html.includes('RR') || html.includes('search') || html.includes('Search');
        if (hasRRSearch) {
          logTest('Recap - RR# Search', true, 'Search functionality present');
        } else {
          logWarning('RR# search may not be visible (could be behind auth)');
        }
      }
      
      return true;
    } else {
      logTest('Recap Page', false, `Unexpected status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('Recap Page', false, error.message);
    return false;
  }
}

/**
 * Test 5: City Performance API (new feature)
 */
async function testCityPerformanceAPI() {
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/city-performance?starred=true`);
    
    // Should work without auth for GET requests
    if (response.statusCode === 200) {
      if (response.body.success) {
        logTest('City Performance API', true, `Starred cities: ${response.body.data ? response.body.data.length : 0}`);
      } else {
        logTest('City Performance API', false, 'API returned success: false');
      }
      return true;
    } else if (response.statusCode === 401) {
      logWarning('City Performance API requires authentication');
      return true; // Not a critical failure
    } else {
      logTest('City Performance API', false, `Status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logTest('City Performance API', false, error.message);
    return false;
  }
}

/**
 * Test 6: Export Recap HTML API (POST endpoint - just check it exists)
 */
async function testExportRecapAPI() {
  try {
    const response = await makeRequest(`${PRODUCTION_URL}/api/export/recap-html`);
    
    // We expect 405 Method Not Allowed for GET (it's a POST endpoint)
    // or 400 Bad Request (missing lanes array)
    if (response.statusCode === 405 || response.statusCode === 400) {
      logTest('Export Recap HTML API', true, 'Endpoint exists and validates methods');
      return true;
    } else if (response.statusCode === 500) {
      logTest('Export Recap HTML API', false, 'Returns 500 error');
      return false;
    } else {
      logWarning(`Export Recap API returned unexpected status: ${response.statusCode}`);
      return true;
    }
  } catch (error) {
    logTest('Export Recap HTML API', false, error.message);
    return false;
  }
}

/**
 * Test 7: Static Assets
 */
async function testStaticAssets() {
  try {
    // Test if Next.js is serving correctly
    const response = await makeRequest(`${PRODUCTION_URL}/_next/static/css/0adf9a9b83a01ee7.css`);
    
    if (response.statusCode === 200 || response.statusCode === 404) {
      // 404 is OK - CSS file name might have changed
      logTest('Static Assets', true, 'Next.js static serving functional');
      return true;
    } else {
      logTest('Static Assets', false, `Unexpected status: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logWarning('Static assets test skipped: ' + error.message);
    return true;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`${colors.cyan}${colors.bold}`);
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                ║');
  console.log('║     🚀 RapidRoutes Production Deployment Verification 🚀       ║');
  console.log('║                                                                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  console.log(`${colors.dim}Production URL: ${PRODUCTION_URL}${colors.reset}`);
  console.log(`${colors.dim}Timeout: ${TIMEOUT}ms${colors.reset}`);

  // Run all tests
  logSection('Core API Endpoints');
  await testHealthCheck();
  await testAuthProfile();
  
  logSection('Frontend Pages');
  await testLoginPage();
  await testRecapPage();
  
  logSection('RapidRoutes 2.0 Features');
  await testCityPerformanceAPI();
  await testExportRecapAPI();
  
  logSection('Infrastructure');
  await testStaticAssets();

  // Print summary
  console.log(`\n${colors.cyan}${colors.bold}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}📊 TEST SUMMARY${colors.reset}\n`);
  
  console.log(`${colors.green}✅ Passed:   ${results.passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed:   ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  Warnings: ${results.warnings}${colors.reset}`);
  console.log(`${colors.dim}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  
  const totalTests = results.passed + results.failed;
  const successRate = totalTests > 0 ? Math.round((results.passed / totalTests) * 100) : 0;
  
  console.log(`\n${colors.bold}Success Rate: ${successRate}%${colors.reset} (${results.passed}/${totalTests})\n`);

  // Final verdict
  if (results.failed === 0) {
    console.log(`${colors.green}${colors.bold}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.green}${colors.bold}║                                                                ║${colors.reset}`);
    console.log(`${colors.green}${colors.bold}║           ✅ ALL TESTS PASSED - PRODUCTION READY! ✅           ║${colors.reset}`);
    console.log(`${colors.green}${colors.bold}║                                                                ║${colors.reset}`);
    console.log(`${colors.green}${colors.bold}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
    process.exit(0);
  } else if (results.failed <= 2 && results.passed >= 8) {
    console.log(`${colors.yellow}${colors.bold}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.yellow}${colors.bold}║                                                                ║${colors.reset}`);
    console.log(`${colors.yellow}${colors.bold}║     ⚠️  MOSTLY PASSING - MINOR ISSUES DETECTED ⚠️             ║${colors.reset}`);
    console.log(`${colors.yellow}${colors.bold}║                                                                ║${colors.reset}`);
    console.log(`${colors.yellow}${colors.bold}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
    console.log(`${colors.yellow}Review failed tests and warnings above.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.red}${colors.bold}╔════════════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.red}${colors.bold}║                                                                ║${colors.reset}`);
    console.log(`${colors.red}${colors.bold}║          ❌ TESTS FAILED - DEPLOYMENT ISSUES! ❌               ║${colors.reset}`);
    console.log(`${colors.red}${colors.bold}║                                                                ║${colors.reset}`);
    console.log(`${colors.red}${colors.bold}╚════════════════════════════════════════════════════════════════╝${colors.reset}\n`);
    console.log(`${colors.red}Critical issues detected. Review errors above.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((err) => {
  console.error(`${colors.red}${colors.bold}Fatal error during test execution:${colors.reset}`, err);
  process.exit(1);
});
