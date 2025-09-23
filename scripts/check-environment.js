#!/usr/bin/env node
// scripts/check-environment.js
// Quick script to check environment variable configuration

const env = process.env;

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  fg: {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
  }
};

// Format a heading
function printHeading(text) {
  console.log(`\n${colors.fg.cyan}${colors.bright}${text}${colors.reset}`);
  console.log(`${colors.fg.cyan}${colors.bright}${'='.repeat(text.length)}${colors.reset}\n`);
}

// Check if an environment variable is set
function checkEnvVar(name, expected = null) {
  const value = env[name];
  const isSet = typeof value !== 'undefined';
  const matches = expected === null || value === expected;
  
  const statusColor = isSet 
    ? (matches ? colors.fg.green : colors.fg.yellow) 
    : colors.fg.red;
  
  const statusText = isSet
    ? (matches ? '✓ SET' : '⚠ UNEXPECTED')
    : '✗ NOT SET';
  
  console.log(`${statusColor}${statusText}${colors.reset} ${colors.bright}${name}${colors.reset} = ${isSet ? `"${value}"` : 'undefined'}`);
  
  return { isSet, matches, value };
}

// Calculate test mode status
function calculateTestMode() {
  const isDev = env.NODE_ENV !== 'production';
  const testModeEnabled = isDev || env.ALLOW_TEST_MODE === 'true';
  const mockEnabled = isDev || env.ENABLE_MOCK_AUTH === 'true';
  
  return {
    isDev,
    testModeEnabled,
    mockEnabled,
    effectiveConfig: {
      testMode: {
        development: true,
        production: testModeEnabled
      },
      mockAuth: {
        development: true, 
        production: mockEnabled
      }
    }
  };
}

// Print a test mode summary
function printTestModeSummary(config) {
  const { isDev, testModeEnabled, mockEnabled, effectiveConfig } = config;
  
  console.log(`\n${colors.fg.blue}Current environment: ${colors.bright}${env.NODE_ENV || 'undefined'}${colors.reset}`);
  
  const currentEnv = isDev ? 'development' : 'production';
  const testModeStatus = effectiveConfig.testMode[currentEnv];
  const mockAuthStatus = effectiveConfig.mockAuth[currentEnv];
  
  console.log(`\n${colors.fg.yellow}Test Mode Status:${colors.reset}`);
  console.log(`- Test Mode Available: ${testModeStatus ? colors.fg.green + 'YES' : colors.fg.red + 'NO'}${colors.reset}`);
  console.log(`- Mock Auth Available: ${mockAuthStatus ? colors.fg.green + 'YES' : colors.fg.red + 'NO'}${colors.reset}`);
  
  if (!testModeStatus) {
    console.log(`\n${colors.fg.red}Test mode is disabled. To enable, set ${colors.bright}ALLOW_TEST_MODE=true${colors.reset}`);
  }
  
  if (!mockAuthStatus) {
    console.log(`\n${colors.fg.red}Mock auth is disabled. To enable, set ${colors.bright}ENABLE_MOCK_AUTH=true${colors.reset}`);
  }
}

// Main function
function main() {
  printHeading('Environment Variable Check');
  
  // Critical variables
  const nodeEnv = checkEnvVar('NODE_ENV');
  const allowTestMode = checkEnvVar('ALLOW_TEST_MODE');
  const enableMockAuth = checkEnvVar('ENABLE_MOCK_AUTH');
  
  // Calculate test mode configuration
  const testModeConfig = calculateTestMode();
  printTestModeSummary(testModeConfig);
  
  // Print additional environment info
  printHeading('Additional Environment Information');
  
  // System info
  console.log(`${colors.fg.blue}Node.js Version:${colors.reset} ${process.version}`);
  console.log(`${colors.fg.blue}Platform:${colors.reset} ${process.platform}`);
  console.log(`${colors.fg.blue}Architecture:${colors.reset} ${process.arch}`);
  
  // Vercel-specific info if available
  if (env.VERCEL_ENV) {
    console.log(`\n${colors.fg.magenta}Vercel Information:${colors.reset}`);
    checkEnvVar('VERCEL_ENV');
    checkEnvVar('VERCEL_REGION');
    checkEnvVar('VERCEL_URL');
  }
  
  // Print recommendations
  printHeading('Recommendations');
  
  if (nodeEnv.value !== 'development' && nodeEnv.value !== 'production') {
    console.log(`${colors.fg.yellow}• Set ${colors.bright}NODE_ENV${colors.reset}${colors.fg.yellow} to either "development" or "production"${colors.reset}`);
  }
  
  if (!allowTestMode.isSet) {
    console.log(`${colors.fg.yellow}• Set ${colors.bright}ALLOW_TEST_MODE=true${colors.reset}${colors.fg.yellow} if you need test mode in production${colors.reset}`);
  }
  
  if (!enableMockAuth.isSet) {
    console.log(`${colors.fg.yellow}• Set ${colors.bright}ENABLE_MOCK_AUTH=true${colors.reset}${colors.fg.yellow} if you need mock authentication in production${colors.reset}`);
  }
  
  console.log('');
}

// Run the script
main();