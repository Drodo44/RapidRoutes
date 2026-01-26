// scripts/test-intelligence-endpoint.js
// Simple script to test the intelligence-pairing endpoint with various configurations

const fetch = require('node-fetch');

// Configuration options
const CONFIG = {
  url: process.env.API_URL || 'http://localhost:3000/api/intelligence-pairing',
  testCases: [
    {
      name: 'Test Mode + Mock Auth',
      body: {
        origin_city: 'Cincinnati',
        origin_state: 'OH',
        destination_city: 'Chicago', 
        destination_state: 'IL',
        equipment_code: 'V',
        test_mode: true,
        mock_auth: true,
        debug_env: true
      }
    },
    {
      name: 'Test Mode Only',
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
      name: 'Mock Auth Only',
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
      name: 'No Test Flags',
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
    
    const data = await response.json();
    
    console.log(`\n${colors.green}Response (${endTime - startTime}ms):${colors.reset}`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    // Check for success or error
    if (response.ok) {
      console.log(`${colors.green}✅ Success${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ Error${colors.reset}`);
    }
    
    // Display environment debug info if available
    if (data.environment || data.debug) {
      console.log(`\n${colors.yellow}Environment Info:${colors.reset}`);
      const envInfo = data.environment || data.debug?.environment;
      if (envInfo) {
        console.log(JSON.stringify(envInfo, null, 2));
      }
    }
    
    // Display authentication info if available
    if (data.authentication || data.debug?.authentication) {
      console.log(`\n${colors.yellow}Authentication Info:${colors.reset}`);
      const authInfo = data.authentication || data.debug?.authentication;
      if (authInfo) {
        console.log(JSON.stringify(authInfo, null, 2));
      }
    }
    
    // Display test mode config if available
    if (data.testModeConfig || data.debug?.testConfig) {
      console.log(`\n${colors.yellow}Test Mode Config:${colors.reset}`);
      const testConfig = data.testModeConfig || data.debug?.testConfig;
      if (testConfig) {
        console.log(JSON.stringify(testConfig, null, 2));
      }
    }
    
    return { success: response.ok, status: response.status, data };
  } catch (error) {
    console.error(`${colors.red}Error running test:${colors.reset}`, error.message);
    return { success: false, error: error.message };
  }
}

// Run all test cases
async function runAllTests() {
  console.log(`${colors.blue}${colors.bright}=== Intelligence Pairing Endpoint Test ====${colors.reset}`);
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

runAllTests().catch(console.error);