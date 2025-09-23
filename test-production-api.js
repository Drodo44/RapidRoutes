// test-intelligence-api.js
// Direct test for the intelligence-pairing API with debug options

import fetch from 'node-fetch';
import { execSync } from 'child_process';

// Configuration
const CONFIG = {
  // Update this with your actual production URL
  url: process.env.API_URL || 'https://rapid-routes.vercel.app/api/intelligence-pairing',
  testCases: [
    {
      name: 'Production with Test Mode',
      body: {
        origin_city: 'Cincinnati',
        origin_state: 'OH',
        destination_city: 'Chicago',
        destination_state: 'IL',
        equipment_code: 'V',
        test_mode: true,
        debug_env: true
      }
    },
    {
      name: 'Production with Mock Auth',
      body: {
        origin_city: 'Cincinnati',
        origin_state: 'OH',
        destination_city: 'Chicago',
        destination_state: 'IL',
        equipment_code: 'V',
        mock_auth: true,
        debug_env: true
      }
    },
    {
      name: 'Production Default',
      body: {
        origin_city: 'Cincinnati',
        origin_state: 'OH',
        destination_city: 'Chicago',
        destination_state: 'IL',
        equipment_code: 'V',
        debug_env: true
      }
    }
  ]
};

// Format console output with colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Run a single test case
async function runTestCase(testCase) {
  console.log(`\n${colors.cyan}${colors.bright}Running Test: ${testCase.name}${colors.reset}`);
  console.log(`${colors.dim}Request Body:${colors.reset}`);
  console.log(JSON.stringify(testCase.body, null, 2));
  
  try {
    const startTime = Date.now();
    const response = await fetch(CONFIG.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Env': 'true'
      },
      body: JSON.stringify(testCase.body)
    });
    const endTime = Date.now();
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { rawResponse: responseText };
    }
    
    console.log(`\n${colors.green}Response (${endTime - startTime}ms):${colors.reset}`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    // Check for success or error
    if (response.ok) {
      console.log(`${colors.green}✅ Success${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Error${colors.reset}`);
    }
    
    // Display pretty printed response
    console.log(`\n${colors.yellow}Response Data:${colors.reset}`);
    console.log(JSON.stringify(data, null, 2));
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`${colors.red}Error running test:${colors.reset}`, error.message);
    return { success: false, error: error.message };
  }
}

// Run all test cases
async function runAllTests() {
  console.log(`${colors.blue}${colors.bright}=== Intelligence Pairing API Test ====${colors.reset}`);
  console.log(`${colors.blue}URL: ${CONFIG.url}${colors.reset}`);
  console.log(`${colors.blue}Test Cases: ${CONFIG.testCases.length}${colors.reset}`);
  
  const results = [];
  
  for (const testCase of CONFIG.testCases) {
    const result = await runTestCase(testCase);
    results.push({ 
      name: testCase.name,
      success: result.success,
      status: result.status
    });
  }
  
  // Summary
  console.log(`\n${colors.blue}${colors.bright}=== Test Summary ====${colors.reset}`);
  for (const result of results) {
    const statusColor = result.success ? colors.green : colors.red;
    const statusSymbol = result.success ? '✅' : '❌';
    console.log(`${statusColor}${statusSymbol} ${result.name}: ${result.status || 'ERROR'}${colors.reset}`);
  }
}

// Check for node-fetch
try {
  await import('node-fetch');
} catch (e) {
  console.error('node-fetch is required. Installing...');
  execSync('npm install node-fetch');
  console.log('node-fetch installed. Running tests...');
}

runAllTests().catch(console.error);