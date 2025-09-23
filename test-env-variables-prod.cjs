// test-env-variables-prod.cjs
// Test script for checking environment variables in production

const fetch = require('node-fetch');

// Configuration
const CONFIG = {
  url: 'https://rapid-routes.vercel.app/api/debug/env-check',
  debugToken: 'SPECIAL_DEBUG_TOKEN'
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

async function checkEnvironment() {
  console.log(`${colors.blue}${colors.bright}=== Production Environment Check ====${colors.reset}`);
  console.log(`URL: ${CONFIG.url}\n`);
  
  try {
    const response = await fetch(`${CONFIG.url}?debug_token=${CONFIG.debugToken}`);
    
    if (!response.ok) {
      console.error(`${colors.red}Error: HTTP ${response.status} ${response.statusText}${colors.reset}`);
      const text = await response.text();
      console.error(text);
      return;
    }
    
    const data = await response.json();
    
    console.log(`${colors.yellow}Environment Variables:${colors.reset}`);
    for (const [key, value] of Object.entries(data.environmentInfo)) {
      const valueColor = value ? colors.green : colors.red;
      console.log(`${key}: ${valueColor}${value || 'not set'}${colors.reset}`);
    }
    
    console.log(`\n${colors.yellow}Computed Values:${colors.reset}`);
    for (const [key, value] of Object.entries(data.computedValues)) {
      const valueColor = value ? colors.green : colors.red;
      console.log(`${key}: ${valueColor}${value}${colors.reset}`);
    }
    
    console.log(`\n${colors.yellow}Server Info:${colors.reset}`);
    console.log(`Timestamp: ${data.serverInfo.timestamp}`);
    console.log(`Node Version: ${data.serverInfo.nodeVersion}`);
    
    // Print recommendations
    console.log(`\n${colors.blue}${colors.bright}Recommendations:${colors.reset}`);
    
    if (!data.environmentInfo.ALLOW_TEST_MODE) {
      console.log(`${colors.yellow}• Set ALLOW_TEST_MODE=true in Vercel environment variables${colors.reset}`);
    }
    
    if (!data.environmentInfo.ENABLE_MOCK_AUTH) {
      console.log(`${colors.yellow}• Set ENABLE_MOCK_AUTH=true in Vercel environment variables${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    console.error('Make sure the debug endpoint is deployed and accessible.');
  }
}

// Run the check
checkEnvironment().catch(console.error);